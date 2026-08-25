import requests
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Order


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    if not settings.KHALTI_SECRET_KEY:
        return Response(
            {'error': 'Payment is not configured on this server (missing KHALTI_SECRET_KEY in .env).'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    order_id = request.data.get('order_id')
    try:
        order = Order.objects.get(id=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    payload = {
        "return_url": "http://localhost:5173/payment-callback",
        "website_url": "http://localhost:5173",
        "amount": order.total_amount * 100,  # Khalti needs amount in paisa
        "purchase_order_id": str(order.id),
        "purchase_order_name": f"Order #{order.id}",
        "customer_info": {
            "name": request.user.get_full_name() or request.user.username,
            "email": request.user.email,
        }
    }

    headers = {"Authorization": f"Key {settings.KHALTI_SECRET_KEY}"}

    resp = requests.post(
        f"{settings.KHALTI_BASE_URL}/epayment/initiate/",
        json=payload,
        headers=headers,
    )

    if resp.status_code != 200:
        return Response({'error': 'Payment initiation failed', 'detail': resp.json()},
                         status=status.HTTP_400_BAD_REQUEST)

    data = resp.json()
    order.khalti_pidx = data.get('pidx')
    order.save()

    return Response({'payment_url': data.get('payment_url')})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    pidx = request.data.get('pidx')
    if not pidx:
        return Response({'error': 'pidx required'}, status=status.HTTP_400_BAD_REQUEST)

    headers = {"Authorization": f"Key {settings.KHALTI_SECRET_KEY}"}
    resp = requests.post(
        f"{settings.KHALTI_BASE_URL}/epayment/lookup/",
        json={"pidx": pidx},
        headers=headers,
    )

    if resp.status_code != 200:
        return Response({'error': 'Verification failed'}, status=status.HTTP_400_BAD_REQUEST)

    data = resp.json()
    try:
        order = Order.objects.get(khalti_pidx=pidx, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    # Idempotency: if we've already processed this order, don't do it again
    # (Khalti's callback / a page refresh can hit this endpoint more than once).
    if order.status == 'paid':
        return Response({'status': 'paid', 'order_id': order.id})
    if order.status == 'failed':
        return Response({'status': 'failed', 'order_id': order.id})

    khalti_status = data.get('status')

    if khalti_status == 'Completed':
        # Stock was already deducted at checkout() time, so we only need
        # to flip the order status here.
        order.status = 'paid'
        order.payment_method = 'khalti'
        order.save(update_fields=['status', 'payment_method'])
        return Response({'status': 'paid', 'order_id': order.id})

    elif khalti_status in ('Expired', 'User canceled'):
        order.status = 'cancelled'
        order.save(update_fields=['status'])
        _restock_order_items(order)
        return Response({'status': 'cancelled', 'order_id': order.id, 'detail': data})

    else:
        order.status = 'failed'
        order.save(update_fields=['status'])
        _restock_order_items(order)
        return Response({'status': 'failed', 'order_id': order.id, 'detail': data})


def _restock_order_items(order):
    """Return reserved stock to the catalog when a payment doesn't complete.

    checkout() deducts stock immediately when the order is created, so if
    the payment ultimately fails or is cancelled, that stock needs to go
    back so other customers can buy it.
    """
    for item in order.items.select_related('product').all():
        if item.product is not None:
            item.product.stock_quantity += item.quantity
            item.product.save(update_fields=['stock_quantity'])