from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, Variant
from .serializers import ProductSerializer, VariantSerializer


class ProductListView(generics.ListAPIView):
    """GET /api/products -> list all products with their variants."""

    queryset = Product.objects.prefetch_related("variants").all()
    serializer_class = ProductSerializer


class ProductDetailView(generics.RetrieveUpdateAPIView):
    """
    GET /api/products/<id>  -> a single product with its variants
    PUT /api/products/<id>  -> update a product's title/variants
    """

    queryset = Product.objects.prefetch_related("variants").all()
    serializer_class = ProductSerializer


class VariantDeleteView(APIView):
    """DELETE /api/variants/<id> -> delete a single variant."""

    def delete(self, request, pk):
        variant = get_object_or_404(Variant, pk=pk)
        variant_id = variant.id
        variant.delete()
        return Response({"deleted": True, "id": variant_id})
