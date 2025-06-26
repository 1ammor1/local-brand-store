import {Types} from "mongoose";
const validation = (schema) =>{
    return (req,res,next)=>
    {
        const data = {...req.body,...req.params,...req.query};
        if(req.file || req.files?.length) data.file = req.file || req.files;
        const result = schema.validate(data,{abortEarly: false});
        if(result.error){
            const messageList = result.error.details.map((detail) => detail.message).join(", ");
            return next(new Error(messageList,{cause: 400}));
        }
        return next();
    }
}

export const isVaildObjectId = (value,helpers) => 
{
    if(Types.ObjectId.isValid(value)) return true;
        return helpers.message("invalid id");
}

export default validation