from django.core.management.base import BaseCommand
from catalog.models import OrderItem


class Command(BaseCommand):
    help = 'Backfills empty seller snapshot fields on old OrderItems using their product\'s current seller'

    def handle(self, *args, **options):
        items = OrderItem.objects.filter(
            seller_business_snapshot=''
        ).select_related('product__seller__user')

        updated = 0
        for item in items:
            if item.product and item.product.seller:
                seller = item.product.seller
                item.seller_business_snapshot = seller.business_name
                item.seller_contact_snapshot = seller.contact_info
                if seller.user:
                    item.seller_name_snapshot = seller.user.first_name or seller.user.username
                    item.seller_email_snapshot = seller.user.email
                item.save()
                updated += 1

        self.stdout.write(self.style.SUCCESS(f'Backfilled {updated} order items.'))