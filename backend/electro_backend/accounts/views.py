from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, SellerRegisterSerializer, CustomerPreferenceSerializer
from .models import Seller, CustomerPreference
from .permissions import IsAdmin
from .serializers import ProfileSerializer
from django.contrib.auth import get_user_model

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class SellerRegisterView(generics.CreateAPIView):
    serializer_class = SellerRegisterSerializer
    permission_classes = [IsAuthenticated]


class ApproveSellerView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, seller_id):
        try:
            seller = Seller.objects.get(id=seller_id)
        except Seller.DoesNotExist:
            return Response({'error': 'Seller not found'}, status=404)

        action = request.data.get('action')
        if action == 'approve':
            seller.verification_status = 'approved'
        elif action == 'reject':
            seller.verification_status = 'rejected'
        else:
            return Response({'error': 'Invalid action, must be approve or reject'}, status=400)

        seller.save()
        return Response({'status': seller.verification_status})


class SetPreferenceView(generics.CreateAPIView):
    serializer_class = CustomerPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        pref, created = CustomerPreference.objects.update_or_create(
            user=request.user,
            defaults=request.data
        )
        serializer = self.get_serializer(pref)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def has_preferences(request):
    exists = CustomerPreference.objects.filter(user=request.user).exists()
    return Response({'has_preferences': exists})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whoami(request):
    user = request.user
    data = {'username': user.username, 'role': user.role}
    if user.role == 'seller':
        try:
            seller = Seller.objects.get(user=user)
            data['is_seller_profile_complete'] = True
            data['verification_status'] = seller.verification_status
        except Seller.DoesNotExist:
            data['is_seller_profile_complete'] = False
    return Response(data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    serializer = ProfileSerializer(request.user)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    first_name = request.data.get('first_name')
    email = request.data.get('email')

    if first_name is not None:
        user.first_name = first_name
    if email is not None:
        user.email = email
    user.save()

    serializer = ProfileSerializer(user)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_seller_profile(request):
    try:
        seller = request.user.seller_profile
    except Seller.DoesNotExist:
        return Response({'error': 'Seller profile not found'}, status=status.HTTP_404_NOT_FOUND)

    business_name = request.data.get('business_name')
    contact_info = request.data.get('contact_info')

    if business_name is not None:
        seller.business_name = business_name
    if contact_info is not None:
        seller.contact_info = contact_info
    seller.save()

    serializer = ProfileSerializer(request.user)
    return Response(serializer.data)



User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_customers(request):
    customers = User.objects.filter(role='customer').order_by('-date_joined')
    data = [
        {
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'date_joined': u.date_joined,
        }
        for u in customers
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_sellers(request):
    sellers = Seller.objects.select_related('user').order_by('-user__date_joined')
    data = [
        {
            'id': s.id,
            'user_id': s.user.id,
            'username': s.user.username,
            'business_name': s.business_name,
            'contact_info': s.contact_info,
            'verification_status': s.verification_status,
            'date_joined': s.user.date_joined,
        }
        for s in sellers
    ]
    return Response(data)