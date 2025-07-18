import { Router } from "express";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateItemQuantity,
  clearCart,
} from "../../Modules/cart/cart.controller.js";
import { authentication } from "../../middleware/authentication.middleware.js";
import * as cartValidation from "./cart.validation.js"
import validation from "../../middleware/validation.middleware.js";
const router = Router();

router.use(authentication);

router.post("/",validation(cartValidation.addToCartSchema),addToCart);               
router.get("/", getCart);                        
router.delete("/:productId/:color/:size",validation(cartValidation.removeFromCartSchema) ,removeFromCart);    
router.patch("/:productId",validation(cartValidation.updateQuantityBodySchema) ,updateItemQuantity); 
router.delete("/", clearCart);                   

export default router;
