from django.contrib import admin

from .models import Product, Variant


class VariantInline(admin.TabularInline):
    model = Variant
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "match_percentage")
    search_fields = ("title",)
    inlines = [VariantInline]


@admin.register(Variant)
class VariantAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "pack_name", "price")
    search_fields = ("pack_name", "product__title")
