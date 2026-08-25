from django.core.management.base import BaseCommand
from catalog.models import Product


class Command(BaseCommand):
    help = (
        "Frees up a handful of products (sets seller back to None) so the "
        "'Browse & Claim' feature has something to demo. Safe to run any "
        "time before a demo.\n\n"
        "By default this only shows what it WOULD do. Pass --apply to "
        "actually make the change."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Actually unassign the products (without this, it only previews).',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='How many products to free up (default: 10).',
        )
        parser.add_argument(
            '--brand',
            type=str,
            default=None,
            help="Only free up products from this brand (e.g. 'Vivo'), so you "
                 "can demo a specific search term.",
        )

    def handle(self, *args, **options):
        apply_changes = options['apply']
        count = options['count']
        brand = options['brand']

        products = Product.objects.filter(seller__isnull=False)
        if brand:
            products = products.filter(brand__name__iexact=brand)

        products = products[:count]

        if not products:
            self.stdout.write(self.style.WARNING(
                f"No matching claimed products found"
                + (f" for brand '{brand}'." if brand else ".")
            ))
            return

        self.stdout.write(f"{'Would free up' if not apply_changes else 'Freeing up'} "
                           f"{len(products)} product(s):\n")

        for product in products:
            self.stdout.write(
                f"  {product.product_name} (currently: {product.seller.business_name})"
            )
            if apply_changes:
                product.seller = None
                product.seller_name = ''
                product.save(update_fields=['seller', 'seller_name'])

        if apply_changes:
            self.stdout.write(self.style.SUCCESS(f"\nDone. These products are now unclaimed."))
        else:
            self.stdout.write(self.style.WARNING(
                "\nThis was a preview only — nothing was changed. "
                "Re-run with --apply to actually free these up."
            ))