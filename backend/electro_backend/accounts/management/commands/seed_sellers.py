# accounts/management/commands/seed_dummy_sellers.py
import random
from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import User, Seller
from catalog.models import Product

DUMMY_SELLERS = [
    {
        'username': 'technepal_seller',
        'business_name': 'Tech Nepal',
        'person_name': 'Ram Bahadur Thapa',
        'email_domain': 'technepal.com.np',
    },
    {
        'username': 'electrosansar_seller',
        'business_name': 'ElectroSansar',
        'person_name': 'Sita Kumari Sharma',
        'email_domain': 'electrosansar.com',
    },
    {
        'username': 'himalayangadgets_seller',
        'business_name': 'Himalayan Gadgets',
        'person_name': 'Kishor Gurung',
        'email_domain': 'himalayangadgets.com.np',
    },
    {
        'username': 'sagarmathaelectronics_seller',
        'business_name': 'Sagarmatha Electronics',
        'person_name': 'Anita Rai',
        'email_domain': 'sagarmathaelectronics.com',
    },
    {
        'username': 'everesttechstore_seller',
        'business_name': 'Everest Tech Store',
        'person_name': 'Dipesh Karki',
        'email_domain': 'everesttechstore.com.np',
    },
    {
        'username': 'nepaldigitalmart_seller',
        'business_name': 'Nepal Digital Mart',
        'person_name': 'Bimala Tamang',
        'email_domain': 'nepaldigitalmart.com',
    },
    {
        'username': 'annapurnaelectronics_seller',
        'business_name': 'Annapurna Electronics',
        'person_name': 'Suresh Maharjan',
        'email_domain': 'annapurnaelectronics.com.np',
    },
]


def random_np_phone():
    return f"+977-98{random.randint(10000000, 99999999)}"


def make_email(name, domain):
    local = name.lower().replace(' ', '.')
    return f"{local}@{domain}"


class Command(BaseCommand):
    help = 'Creates 7 dummy sellers with distinct business/person info and randomly distributes unclaimed products across them'

    def handle(self, *args, **options):
        sellers = []

        with transaction.atomic():
            for data in DUMMY_SELLERS:
                email = make_email(data['person_name'], data['email_domain'])

                user, created = User.objects.get_or_create(
                    username=data['username'],
                    defaults={
                        'email': email,
                        'first_name': data['person_name'],
                        'role': 'seller',
                    }
                )
                if created:
                    user.set_unusable_password()
                    user.save()

                seller, _ = Seller.objects.update_or_create(
                    user=user,
                    defaults={
                        'business_name': data['business_name'],
                        'contact_info': random_np_phone(),
                        'verification_status': 'approved',
                    }
                )
                sellers.append(seller)
                self.stdout.write(self.style.SUCCESS(
                    f"{seller.business_name} | {user.first_name} | {seller.contact_info} | {user.email}"
                ))

            unclaimed = list(Product.objects.filter(seller__isnull=True))
            random.shuffle(unclaimed)

            for i, product in enumerate(unclaimed):
                chosen_seller = sellers[i % len(sellers)]
                product.seller = chosen_seller
                product.seller_name = chosen_seller.business_name

            Product.objects.bulk_update(unclaimed, ['seller', 'seller_name'], batch_size=500)

            self.stdout.write(self.style.SUCCESS(
                f"Distributed {len(unclaimed)} products across {len(sellers)} dummy sellers."
            ))