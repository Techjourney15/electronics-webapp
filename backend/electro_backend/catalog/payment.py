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
    order_id = request.data.get('order_id')
    print("========== PAYMENT DEBUG ==========")
    print("ORDER ID RECEIVED:", order_id)
    print("REQUEST USER:", request.user)
    print("REQUEST USER ID:", request.user.id)

    try:
        order = Order.objects.get(id=order_id)

        print("ORDER FOUND:", order.id)
        print("ORDER USER ID:", order.user_id)
        print("CURRENT USER ID:", request.user.id)

        if order.user_id != request.user.id:
            print("USER MISMATCH!")
            return Response(
            {
                'error': 'Order belongs to another user',
                'order_user_id': order.user_id,
                'current_user_id': request.user.id,
            },
            status=status.HTTP_403_FORBIDDEN
        )

    except Order.DoesNotExist:
        print("ORDER DOES NOT EXIST!")
        return Response(
        {
            'error': 'Order does not exist',
            'received_order_id': order_id,
        },
        status=status.HTTP_404_NOT_FOUND
        )

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
        return Response(
            {'error': 'pidx required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    headers = {
        "Authorization": f"Key {settings.KHALTI_SECRET_KEY}"
    }

    resp = requests.post(
        f"{settings.KHALTI_BASE_URL}/epayment/lookup/",
        json={"pidx": pidx},
        headers=headers,
    )

    if resp.status_code != 200:
        return Response(
            {'error': 'Verification failed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    data = resp.json()

    try:
        order = Order.objects.prefetch_related(
            'items__product'
        ).get(
            khalti_pidx=pidx,
            user=request.user
        )

    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Payment successful
    if data.get('status') == 'Completed':

        # Prevent stock from being deducted twice
        if order.status == 'paid':
            return Response({
                'status': 'paid',
                'order_id': order.id
            })

        # Check stock BEFORE marking order as paid
        for item in order.items.all():

            if item.product is None:
                return Response(
                    {
                        'error': f'Product for "{item.product_name_snapshot}" '
                                 f'is no longer available.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if item.product.stock_quantity < item.quantity:
                order.status = 'failed'
                order.save(update_fields=['status'])

                return Response(
                    {
                        'error': f'Not enough stock for '
                                  f'{item.product.product_name}',
                        'available_stock': item.product.stock_quantity,
                        'requested_quantity': item.quantity,
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Payment is successful AND stock is available
        for item in order.items.all():

            product = item.product

            product.stock_quantity -= item.quantity
            product.save(update_fields=['stock_quantity'])

        order.status = 'paid'
        order.save(update_fields=['status'])

        return Response({
            'status': 'paid',
            'order_id': order.id
        })

    # Payment failed / cancelled
    else:
        order.status = 'failed'
        order.save(update_fields=['status'])

        return Response({
            'status': 'failed',
            'detail': data
        })