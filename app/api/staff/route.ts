import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'

// Verify the requester is an admin
async function isAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

// GET - list all staff
export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, role')
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()

  const staff = users.map(u => ({
    id: u.id,
    email: u.email,
    role: profiles?.find(p => p.id === u.id)?.role ?? 'staff',
  }))

  return NextResponse.json(staff)
}

// POST - create new staff user
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, password, role } = await req.json()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabaseAdmin.from('profiles').upsert({ id: data.user.id, role: role ?? 'staff' })

  return NextResponse.json({ success: true })
}

// DELETE - remove a staff user
export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
