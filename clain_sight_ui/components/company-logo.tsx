"use client"

import Image from "next/image"
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function CompanyLogo() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/" className="flex items-center gap-2">
            {isCollapsed ? (
              <Image
                src="/favicon.png"
                alt="Claims"
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg object-contain"
              />
            ) : (
              <Image
                src="/logo.png"
                alt="Claims"
                width={140}
                height={32}
                className="h-8 w-auto max-w-[140px] shrink-0 object-contain object-left"
              />
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
