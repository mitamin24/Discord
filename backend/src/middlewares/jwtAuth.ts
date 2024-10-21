import { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || 'random';

export default function jwtAuth(req: Request, res: Response, next: NextFunction):any {
    const token = req.headers.authorization

    if (!token) {
        return res.status(403).json({
            message: "Access denied. No token provided."
        });
    }
    try {
       
        const payload = jwt.verify(token,secret)
        // console.log("payload",payload);
        // @ts-ignore
        req.id = payload.id
        next()

    } catch (error) {
        
        return res.status(403).json({
            message: "Invalid token.",
            error: error instanceof Error ? error.message : "Unknown error"
        });

    }    
}
