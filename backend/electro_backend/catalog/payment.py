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

    if data.get('status') == 'Completed':
        order.status = 'confirmed'
        order.save()
        return Response({'status': 'confirmed', 'order_id': order.id})
    else:
        order.status = 'failed'
        order.save()
        return Response({'status': 'failed', 'detail': data})