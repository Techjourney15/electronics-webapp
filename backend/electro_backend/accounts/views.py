from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, SellerRegisterSerializer, CustomerPreferenceSerializer
from .models import Seller, CustomerPreference
from .permissions import IsAdmin


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