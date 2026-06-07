import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/stat-card'
import { useI18n } from '@/lib/i18n/context'
import { Trophy, Award, Gift, Users, ChevronRight } from 'lucide-react'
import { Link } from 'wouter'

export function CommunityView({ stats }: {
  stats: { participations: number; receiveCount: number; totalReceivedInmu: number; rank: number; totalUsers: number }
}) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard labelKey="total_participations" value={stats.participations} icon={Award} accent="gold" isInmu={false} />
        <StatCard labelKey="total_receives" value={stats.receiveCount} icon={Gift} accent="teal" isInmu={false} />
        <StatCard labelKey="total_received_inmu" value={stats.totalReceivedInmu} icon={Trophy} accent="up" />
        <StatCard labelKey="your_rank" value={stats.rank} icon={Users} accent="default" isInmu={false} hint={`${t('rank')} / ${stats.totalUsers}`} />
      </div>

      <Card className="border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {stats.rank <= 10
            ? '🏆 Top 10! すばらしい成績です！'
            : stats.rank <= stats.totalUsers * 0.3
            ? '💪 上位30%に入っています！'
            : '📊 もっとINMUをアクティブになりましょう！'}
        </p>
      </Card>

      {/* ── Community quick-links ── */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">コミュニティ機能</p>
        </div>
        <ul>
          <li>
            <Link
              href="/ranking"
              className="flex min-h-[52px] items-center gap-3 px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary active:bg-secondary"
            >
              <Trophy className="size-[18px] shrink-0 text-muted-foreground" />
              <span className="flex-1">{t('nav_ranking')}</span>
              <span className="text-xs text-muted-foreground mr-1">
                {stats.rank > 0 ? `#${stats.rank}` : ''}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  )
}
