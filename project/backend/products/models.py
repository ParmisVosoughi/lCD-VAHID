from django.db import models


class Product(models.Model):
    title = models.CharField(max_length=255)
    match_percentage = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.title


class Variant(models.Model):
    product = models.ForeignKey(
        Product, related_name="variants", on_delete=models.CASCADE
    )
    pack_name = models.CharField(max_length=255)
    price = models.BigIntegerField()

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.product.title} - {self.pack_name}"
