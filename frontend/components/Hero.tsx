import { Button } from "@/components/ui/button"
import { ArrowRight, Zap } from "lucide-react"

export function Hero() {
    return (
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10 lg:py-32">
            <div className="flex max-w-[980px] flex-col items-start gap-4">
                <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
                    Maximize Your BNB Yields <br className="hidden sm:inline" />
                    with <span className="text-primary">Automated Strategies</span>.
                </h1>
                <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
                    One-click looping and unwinding on Venus Protocol. Safely leverage your assets with real-time health monitoring and break-even analysis.
                </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="gap-2">
                    Launch App <Zap className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" className="gap-2">
                    Learn More <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </section>
    )
}
