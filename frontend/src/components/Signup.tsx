import axios from "axios"
import { useState } from "react"

const Signup = () => {
    const [email,setEmail] = useState("")
    const [username,setUsername] = useState("")
    const [password,setPassword] = useState("")
  return (
    <div>

      <label>Email</label>
        <br />
      <input onChange={(e) => {
        setEmail(e.target.value)
      }} className="bg-blue-300" type="text" placeholder="email" />
      <br />
      <label>Username</label><br />
      <input onChange={(e) => {
        setUsername(e.target.value)
      }} className="bg-red-200" type="text" placeholder="Should be unique" /><br />
      <label>Password</label><br />
      <input onChange={(e) => {
        setPassword(e.target.value)
      }} className="bg-red-200" type="password" placeholder="password" />
      <br />
      <button onClick={async () => {
        await axios.post("http://localhost:3001/api/auth/signup",
            {
                email,
                username,
                password
            }
        )
      }} className="bg-blue-600">Signup</button>
    </div>
  )
}

export default Signup
