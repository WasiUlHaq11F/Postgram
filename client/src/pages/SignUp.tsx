
import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios"


function SignUp() {

      const [email,setEmail] = useState<string>("")

      const[password,setPassword] = useState<string>("")



  const navigation = useNavigate()

  async function handleSignUp(){
    try{
       await axios.post('http://localhost:8000/register', {
        email,
        password
      })
      console.log("Sign Up Successfull");
      navigation("/");
    
    }catch(error){
      console.error("Error")
      console.log(error)
    }
    
  }

  function handleClick(){
    navigation("/")
  }
   
  return (
    <div className="flex mt-16 border-1 items-center justify-center border-orange-400 w-2xl rounded-lg ">
      <div className="w-full p-4 flex flex-col ">

        <label className="text-orange-500" htmlFor="email">
          Email :{" "}
        </label>
        <input
          className="m-4 bg-white p-4"
          type="email"
          name="email"
          placeholder="Enter your Email"
          required
          onChange={(e) => setEmail(e.target.value) }
        />

        <label className="text-orange-500" htmlFor="name">
          Password:
        </label>
        <input
          className="m-4 bg-white p-4"
          type="password"
          placeholder="Enter your Password"
          required
          onChange={(e) => setPassword(e.target.value) }
        />

        <button className="p-4 m-4 bg-orange-400 rounded-lg" onClick={handleSignUp}>Sign Up</button>
        <p className="mt-10 text-center text-sm boder-1 border-b border-orange-300 text-orange-500 cursor-pointer" onClick={handleClick}>Already have an Account? Login</p>
      </div>
    </div>
  );
}

export default SignUp;