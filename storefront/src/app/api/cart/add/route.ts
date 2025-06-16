import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookieStore = cookies();
    
    // Get cart ID from cookies or create new cart
    let cartId = cookieStore.get('_medusa_cart_id')?.value;
    
    // If no cart exists, create one first
    if (!cartId) {
      const createCartResponse = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/carts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          region_id: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID || 'reg_01H8ZY8YBFXZPBKJHF9H1ZJHZ6'
        }),
      });
      
      if (!createCartResponse.ok) {
        throw new Error('Failed to create cart');
      }
      
      const { cart } = await createCartResponse.json();
      cartId = cart.id;
      
      // Set cart ID in cookies
      const response = NextResponse.json({ success: true });
      response.cookies.set('_medusa_cart_id', cartId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }
    
    // For custom products, we need to handle them specially
    // You might need to create a custom product variant in Medusa for "Custom Mosaic"
    const lineItem = {
      variant_id: "variant_custom_mosaic", // Replace with actual variant ID from your Medusa setup
      quantity: body.quantity || 1,
      metadata: body.metadata || {}
    };
    
    // Add item to cart
    const addToCartResponse = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/carts/${cartId}/line-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lineItem),
    });
    
    if (!addToCartResponse.ok) {
      const errorData = await addToCartResponse.json();
      throw new Error(errorData.message || 'Failed to add item to cart');
    }
    
    const result = await addToCartResponse.json();
    
    return NextResponse.json({ 
      success: true, 
      cart: result.cart,
      message: 'Item added to cart successfully'
    });
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
