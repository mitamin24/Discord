import { useState } from "react"
import axios from "axios"

const Signin = () => {
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  return (
    <div>
      <label>Email</label>
      <br /><input className="bg-blue-400" type="text" placeholder="Email" onChange={(e) => {
        setEmail(e.target.value)
      }}/>
      <br /><label>Password</label>
      <br /><input onChange={(e) => {
        setPassword(e.target.value)
      }} type="password" placeholder="Password" className="bg-red-400" />
      <br /> <br />
      <button className="px-4 py-2 rounded-md border border-black bg-white text-black text-sm hover:shadow-[4px_4px_0px_0px_rgba(0,0,0)] transition duration-200" onClick={async () => {
          await axios.post("http://localhost:3001/api/auth/signin",{
            email,
            password
          })   
      }}>Signin</button>
    </div>
  )
}

export default Signin
