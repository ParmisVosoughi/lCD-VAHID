from django.core.management.base import BaseCommand

from products.models import Product, Variant

SAMPLE_PRODUCTS = [
    ("Nova 8i / honor 50 lite", 94, [("Pack N/F", 25500000)]),
    ("Honor 90", 77, [("Pack W/F", 64000000)]),
    ("honor 400 lite", 70, [("Pack N/F", 68000000)]),
    ("Honor 10 Lite", 70, [("Org 100% (NEW)", 23900000)]),
    ("Honor 200 lite", 70, [("Pack W/F", 64000000)]),
    ("Honor 90 Lite", 70, [("Pack W/F", 29900000)]),
    ("HONOR X9", 62, [("Pack N/F", 28500000)]),
    ("HONOR X7B", 62, [("Pack N/F", 19800000), ("Pack W/F", 22800000)]),
    ("Honor 8X", 62, []),
    ("Honor X9C", 62, [("Pack W/F", 68000000)]),
    ("Honor X7C", 62, []),
    ("Honor X7D", 62, [("Pack N/F", 19500000)]),
    ("HONOR X6B", 62, [("Org 100%", 19200000)]),
    ("Honor X5", 62, [("Org 100%", 17900000)]),
    ("Honor X9A", 62, [("Pack N/F", 49800000), ("Pack W/F", 62500000)]),
    ("Honor X8", 62, [("Org 100% (NEW)", 19000000)]),
    ("Honor X7A", 62, [("Pack N/F", 18400000), ("Pack W/F", 22800000)]),
    ("Honor X7", 62, [("Pack N/F", 18900000), ("Pack W/F", 21900000)]),
    ("Honor X6", 62, [("Pack N/F", 18800000), ("Pack W/F", 22000000)]),
    ("Honor 8C", 62, [("Org 100%", 18400000)]),
]


class Command(BaseCommand):
    help = "Seed the database with the sample catalog used by the Main Page (no-op if products already exist)."

    def handle(self, *args, **options):
        if Product.objects.exists():
            self.stdout.write(self.style.WARNING("Products already exist - skipping seed."))
            return

        for title, match_percentage, variants in SAMPLE_PRODUCTS:
            product = Product.objects.create(title=title, match_percentage=match_percentage)
            for pack_name, price in variants:
                Variant.objects.create(product=product, pack_name=pack_name, price=price)

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(SAMPLE_PRODUCTS)} products."))
