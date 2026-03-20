import { redirect } from 'next/navigation'

export default function AssessmentsPage() {
  redirect('/profile?tab=assessments')
}