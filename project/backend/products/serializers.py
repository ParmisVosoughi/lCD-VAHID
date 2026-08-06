from rest_framework import serializers

from .models import Product, Variant


class VariantSerializer(serializers.ModelSerializer):
    # Writable (not auto read-only) so the Edit Product popup can send back
    # existing variant ids to match against when updating a product.
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Variant
        fields = ["id", "pack_name", "price"]


class ProductSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = ["id", "title", "match_percentage", "variants"]

    def update(self, instance, validated_data):
        """
        Mirrors the previous Flask PUT /api/products/<id> behaviour:
        - update the product's title
        - upsert variants that include an existing id
        - insert variants that don't include an id (new ones added in the popup)
        - delete variants that existed before but are no longer present in the payload
        """
        variants_data = validated_data.pop("variants", None)

        instance.title = validated_data.get("title", instance.title)
        instance.save()

        if variants_data is not None:
            existing_ids = set(instance.variants.values_list("id", flat=True))
            kept_ids = set()

            for variant_data in variants_data:
                variant_id = variant_data.get("id")
                pack_name = (variant_data.get("pack_name") or "").strip()
                price = variant_data.get("price")

                if not pack_name or price is None:
                    continue

                if variant_id and variant_id in existing_ids:
                    Variant.objects.filter(id=variant_id, product=instance).update(
                        pack_name=pack_name, price=price
                    )
                    kept_ids.add(variant_id)
                else:
                    new_variant = Variant.objects.create(
                        product=instance, pack_name=pack_name, price=price
                    )
                    kept_ids.add(new_variant.id)

            removed_ids = existing_ids - kept_ids
            if removed_ids:
                Variant.objects.filter(id__in=removed_ids).delete()

        return instance
