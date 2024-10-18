import {z} from "zod"

// validation for signup inputs
export const signupSchema  = z.object({
    email : z.string().email(),
    username: z.string(),
    password: z.string().min(4,"Password should contain minimum 4 characters").max(20,"Password should not exceed 20 characters")
})

// validation for signin inputs
export const signinSchema = z.object({
    email: z.string(),
    password: z.string().min(4,"Password should contain minimum 4 characters").max(20,"Password should not exceed 20 characters")
})

export type signupUser = z.infer<typeof signupSchema> 
export type signinUser = z.infer<typeof signinSchema>
