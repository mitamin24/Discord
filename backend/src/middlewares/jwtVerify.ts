import { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || 'random';

export default function jwtVerify(req: Request, res: Response, next: NextFunction) {
    // Extract token from the Authorization header
    const token = req.header('Authorization')?.split(' ')[1]; // Get the token part after 'Bearer '

    if (!token) {
        return res.status(403).json({
            message: "Access denied. No token provided."
        });
    }
    try {
       
        const decoded = jwt.verify(token,secret)
        req.user = decoded
        if(!decoded) {
            return res.status(401).json({
                message: "Invalid token"
            })
        }
        next()

    } catch (error) {
        
        return res.status(403).json({
            message: "Invalid token.",
            error: error instanceof Error ? error.message : "Unknown error"
        });

    }    
}
