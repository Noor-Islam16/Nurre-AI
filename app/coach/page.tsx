import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MyClients } from "@/components/coach/MyClients"
import { NotesPanel } from "@/components/coach/NotesPanel"
import { SignOutButton } from "@/components/coach/SignOutButton"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { UserPlus, Users, FileText } from "lucide-react"

type CoachPortalTabsProps = {
  searchParams: Promise<{ tab?: string; userId?: string; offset?: string }>
}

function TabsLayout({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]" style={{ alignItems: 'start' }}>{children}</div>
}

function AddClientTab() {
  return (
    <Card className="bg-card shadow-md border-violet-100">
      <CardContent className="space-y-6 py-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-gray-900">Link a client with a claim code</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Codes are single-use per coach; invalid or expired codes will not link.
          </p>
        </div>

        <Card className="border-dashed border-violet-200 bg-violet-50/30">
          <CardContent className="space-y-4 py-6">
            <form className="space-y-4" id="add-client-form">
              <Input
                name="claimCode"
                placeholder="Enter claim code"
                autoComplete="off"
                required
                className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
              />
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white">
                Link Client
              </Button>
              <div className="text-sm text-muted-foreground" id="add-client-message" />
            </form>
          </CardContent>
        </Card>

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  const form = document.getElementById('add-client-form');
  const messageEl = document.getElementById('add-client-message');
  if (!form || !messageEl) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const code = (formData.get('claimCode') || '').toString().trim();
    if (!code) {
      messageEl.textContent = 'Invalid or expired code';
      messageEl.className = 'text-sm text-destructive';
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.setAttribute('disabled', 'true');
    messageEl.textContent = '';
    messageEl.className = 'text-sm text-muted-foreground';

    try {
      const res = await fetch('/api/coach/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (res.status === 429) {
        messageEl.textContent = 'Too many attempts. Try again shortly.';
        messageEl.className = 'text-sm text-destructive';
        return;
      }

      if (!res.ok) {
        messageEl.textContent = 'Invalid or expired code';
        messageEl.className = 'text-sm text-destructive';
        return;
      }

      const data = await res.json();
      const { userId, name, email } = data || {};
      messageEl.textContent = name || email ? \`Linked to: \${name || 'Client'} (\${email || 'No email'})\` : 'Linked successfully';
      messageEl.className = 'text-sm text-primary';

      const search = new URLSearchParams(window.location.search);
      search.set('tab', 'notes');
      if (userId) search.set('userId', userId);
      const newUrl = window.location.pathname + '?' + search.toString();
      window.location.href = newUrl;
    } catch (error) {
      console.error('Coach redeem error', error);
      messageEl.textContent = 'Something went wrong. Try again.';
      messageEl.className = 'text-sm text-destructive';
    } finally {
      if (submitButton) submitButton.removeAttribute('disabled');
    }
  });
})();
            `,
          }}
        />
      </CardContent>
    </Card>
  )
}

const TAB_KEYS = ["add", "clients", "notes"] as const
type TabKey = (typeof TAB_KEYS)[number]

function normalizeTab(tab?: string): TabKey {
  if (!tab) return "add"
  return TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : "add"
}

export default async function CoachPortalPage({ searchParams }: CoachPortalTabsProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: coachRow } = await supabase
    .from("coaches")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!coachRow) {
    redirect("/")
  }

  const activeTab = normalizeTab(params?.tab)
  const userId = params?.userId

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pt-2 pb-10">
      {/* Header with Logo */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex-shrink-0">
            <Image
              src="/logo-horizontal.png"
              alt="NureeAI"
              width={140}
              height={35}
              className="object-contain"
              priority
            />
          </Link>
          <div className="h-8 w-px bg-violet-200" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Coach Portal</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your clients, notes, and claim codes.</p>
          </div>
        </div>
        <SignOutButton />
      </div>

      <Tabs defaultValue="add" value={activeTab} className="w-full">
        <TabsLayout>
          <div className="flex flex-col">
            <TabsList className="flex h-auto flex-col items-stretch gap-3 bg-transparent p-0 m-0">
              <TabsTrigger asChild value="add">
              <Link
                href="/coach?tab=add"
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                  activeTab === "add"
                    ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-violet-100"
                )}
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Client</span>
              </Link>
            </TabsTrigger>
            <TabsTrigger asChild value="clients">
              <Link
                href="/coach?tab=clients"
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                  activeTab === "clients"
                    ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-violet-100"
                )}
              >
                <Users className="h-4 w-4" />
                <span>My Clients</span>
              </Link>
            </TabsTrigger>
            <TabsTrigger asChild value="notes">
              <Link
                href={userId ? `/coach?tab=notes&userId=${userId}` : "/coach?tab=notes"}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                  activeTab === "notes"
                    ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-violet-100"
                )}
              >
                <FileText className="h-4 w-4" />
                <span>Notes</span>
              </Link>
            </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 self-start">
            <TabsContent value="add" className="mt-0 focus-visible:outline-none">
              <AddClientTab />
            </TabsContent>
            <TabsContent value="clients" className="mt-0 focus-visible:outline-none">
              <MyClients />
            </TabsContent>
            <TabsContent value="notes" className="mt-0 focus-visible:outline-none">
              {userId ? (
                <NotesPanel userId={userId} />
              ) : (
                <div className="rounded-lg border border-dashed border-muted p-6 text-sm text-muted-foreground">
                  Select a client from My Clients to view notes.
                </div>
              )}
            </TabsContent>
          </div>
        </TabsLayout>
      </Tabs>
    </div>
  )
}
