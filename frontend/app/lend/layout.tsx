import { LendInternalNavbar } from "@/components/LendInternalNavbar";

export default function LendLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="pt-32 min-h-screen bg-[#0B0B0F] text-foreground">
            <div className="container py-12 space-y-8 max-w-screen-2xl mx-auto px-8 md:px-16">
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-outfit">Strategy Engine</h1>
                        <div className="text-muted-foreground">Automated leveraging and looping on BSC.</div>
                    </div>

                    {/* Navigation Tabs */}
                    <LendInternalNavbar />
                </div>

                {/* Page Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </div>
        </div>
    );
}
