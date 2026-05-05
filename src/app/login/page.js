"use client"
import { useState } from 'react'

export default function LoginPage(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [msg,setMsg]=useState(null)

  async function submit(e){
    e.preventDefault()
    const res = await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})})
    const data = await res.json()
    if(res.ok){
      window.location.href = '/dashboard'
    } else {
      setMsg(data.error||'Login failed')
    }
  }

  return (
    <main style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center'}}>
      <form onSubmit={submit} style={{width:360,display:'flex',flexDirection:'column',gap:12}}>
        <h2>Sign in</h2>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Sign in</button>
        {msg && <div style={{color:'red'}}>{msg}</div>}
      </form>
    </main>
  )
}
