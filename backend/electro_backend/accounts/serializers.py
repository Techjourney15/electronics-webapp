from rest_framework import serializers
from .models import User, Seller, CustomerPreference


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'name']

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', 'customer'),
            first_name=name,
        )
        return user

class SellerRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        fields = ['business_name', 'contact_info']

    def create(self, validated_data):
        user = self.context['request'].user
        return Seller.objects.create(user=user, **validated_data)


class CustomerPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerPreference
        fields = ['category', 'min_price', 'max_price', 'priority_spec']

class ProfileSerializer(serializers.ModelSerializer):
    preferences = serializers.SerializerMethodField()
    seller_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'role', 'preferences', 'seller_profile']

    def get_preferences(self, obj):
        if obj.role != 'customer':
            return None
        try:
            pref = obj.preference
            return CustomerPreferenceSerializer(pref).data
        except CustomerPreference.DoesNotExist:
            return None

    def get_seller_profile(self, obj):
        if obj.role != 'seller':
            return None
        try:
            seller = obj.seller_profile
            return {
                'business_name': seller.business_name,
                'contact_info': seller.contact_info,
                'verification_status': seller.verification_status,
            }
        except Seller.DoesNotExist:
            return None