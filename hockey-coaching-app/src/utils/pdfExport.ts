import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Game, Shot, Team, Season } from '../types';

export interface GameReportData {
  game: Game;
  team: Team;
  season: Season;
  shots: Shot[];
  opponent: string;
  finalScore: {
    home: number;
    away: number;
  };
  shotStats: {
    totalShots: number;
    goals: number;
    saves: number;
    misses: number;
    blocked: number;
    goalPercentage: number;
  };
  periodBreakdown: Array<{
    period: number;
    shots: number;
    goals: number;
  }>;
  insights: string[];
}

export class PDFExporter {
  private doc: jsPDF;
  private yPosition: number = 20;
  private pageWidth: number = 210;
  private pageHeight: number = 297;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
  }

  async generateGameReport(data: GameReportData): Promise<void> {
    this.addHeader(data);
    this.addGameInfo(data);
    this.addScoreSummary(data);
    this.addShotStatistics(data);
    this.addPeriodBreakdown(data);

    // Capture shot chart if available
    await this.addShotChart();

    this.addInsights(data);
    this.addFooter(data);
  }

  private addHeader(data: GameReportData): void {
    // Title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('🏒 Hockey Coach - Game Report', this.margin, this.yPosition);

    // Subtitle
    this.yPosition += 10;
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`${data.team.name} vs ${data.opponent}`, this.margin, this.yPosition);

    // Date
    this.yPosition += 8;
    this.doc.setFontSize(10);
    this.doc.setTextColor(100);
    const gameDate = new Date(data.game.date).toLocaleDateString();
    this.doc.text(`Game Date: ${gameDate} | Season: ${data.season.name}`, this.margin, this.yPosition);

    this.yPosition += 15;
    this.addSeparator();
  }

  private addGameInfo(data: GameReportData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0);
    this.doc.text('GAME INFORMATION', this.margin, this.yPosition);

    this.yPosition += 8;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const info = [
      `Team: ${data.team.name}`,
      `Opponent: ${data.opponent}`,
      `Periods: ${data.game.periods || 3}`,
      `Period Length: ${data.game.periodMinutes || 20} minutes`,
      `Status: ${data.game.status.toUpperCase()}`
    ];

    info.forEach(line => {
      this.doc.text(line, this.margin, this.yPosition);
      this.yPosition += 5;
    });

    this.yPosition += 5;
  }

  private addScoreSummary(data: GameReportData): void {
    // Score box
    this.doc.setFillColor(240, 248, 255);
    this.doc.rect(this.margin, this.yPosition - 5, this.pageWidth - 2 * this.margin, 25, 'F');

    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0);

    const result = data.finalScore.home > data.finalScore.away ? 'WIN' :
                   data.finalScore.home < data.finalScore.away ? 'LOSS' : 'TIE';
    const resultColor = result === 'WIN' ? [34, 197, 94] :
                        result === 'LOSS' ? [239, 68, 68] : [107, 114, 128];

    // Final score
    const scoreText = `FINAL SCORE: ${data.finalScore.home} - ${data.finalScore.away}`;
    this.doc.text(scoreText, this.margin + 5, this.yPosition + 5);

    // Result
    this.doc.setTextColor(resultColor[0], resultColor[1], resultColor[2]);
    this.doc.text(`RESULT: ${result}`, this.margin + 5, this.yPosition + 15);

    this.yPosition += 35;
  }

  private addShotStatistics(data: GameReportData): void {
    this.doc.setTextColor(0);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SHOT STATISTICS', this.margin, this.yPosition);

    this.yPosition += 10;

    // Create a table-like layout
    const stats = [
      ['Total Shots:', data.shotStats.totalShots.toString()],
      ['Goals:', data.shotStats.goals.toString()],
      ['Saves:', data.shotStats.saves.toString()],
      ['Misses:', data.shotStats.misses.toString()],
      ['Blocked:', data.shotStats.blocked.toString()],
      ['Shooting %:', `${data.shotStats.goalPercentage.toFixed(1)}%`]
    ];

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    stats.forEach(([label, value]) => {
      this.doc.text(label, this.margin, this.yPosition);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(value, this.margin + 40, this.yPosition);
      this.doc.setFont('helvetica', 'normal');
      this.yPosition += 5;
    });

    this.yPosition += 10;
  }

  private addPeriodBreakdown(data: GameReportData): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PERIOD BREAKDOWN', this.margin, this.yPosition);

    this.yPosition += 10;

    // Headers
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Period', this.margin, this.yPosition);
    this.doc.text('Shots', this.margin + 30, this.yPosition);
    this.doc.text('Goals', this.margin + 60, this.yPosition);
    this.doc.text('Percentage', this.margin + 90, this.yPosition);

    this.yPosition += 7;
    this.doc.setFont('helvetica', 'normal');

    data.periodBreakdown.forEach(period => {
      const percentage = period.shots > 0 ? ((period.goals / period.shots) * 100).toFixed(1) : '0.0';

      this.doc.text(period.period.toString(), this.margin + 5, this.yPosition);
      this.doc.text(period.shots.toString(), this.margin + 35, this.yPosition);
      this.doc.text(period.goals.toString(), this.margin + 65, this.yPosition);
      this.doc.text(`${percentage}%`, this.margin + 95, this.yPosition);

      this.yPosition += 5;
    });

    this.yPosition += 15;
  }

  private async addShotChart(): Promise<void> {
    // Look for shot chart element
    const shotChartElement = document.querySelector('[data-shot-chart]') as HTMLElement;

    if (shotChartElement) {
      try {
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('SHOT CHART', this.margin, this.yPosition);

        this.yPosition += 10;

        const canvas = await html2canvas(shotChartElement, {
          backgroundColor: '#ffffff',
          scale: 2
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = this.pageWidth - 2 * this.margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Check if we need a new page
        if (this.yPosition + imgHeight > this.pageHeight - this.margin) {
          this.doc.addPage();
          this.yPosition = this.margin;
        }

        this.doc.addImage(imgData, 'PNG', this.margin, this.yPosition, imgWidth, imgHeight);
        this.yPosition += imgHeight + 15;
      } catch (error) {
        console.warn('Could not capture shot chart:', error);
      }
    }
  }

  private addInsights(data: GameReportData): void {
    if (data.insights.length === 0) return;

    // Check if we need a new page
    if (this.yPosition + (data.insights.length * 5) + 30 > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('COACHING INSIGHTS', this.margin, this.yPosition);

    this.yPosition += 10;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    data.insights.forEach((insight, index) => {
      const bullet = `${index + 1}. `;
      this.doc.text(bullet, this.margin, this.yPosition);

      // Word wrap for long insights
      const lines = this.doc.splitTextToSize(insight, this.pageWidth - 2 * this.margin - 10);
      this.doc.text(lines, this.margin + 8, this.yPosition);
      this.yPosition += lines.length * 4 + 2;
    });

    this.yPosition += 10;
  }

  private addFooter(_data: GameReportData): void {
    const footerY = this.pageHeight - 15;

    this.doc.setFontSize(8);
    this.doc.setTextColor(100);
    this.doc.setFont('helvetica', 'italic');

    const timestamp = new Date().toLocaleString();
    this.doc.text(`Generated by Hockey Coach App on ${timestamp}`, this.margin, footerY);

    // Page number
    const pageCount = this.doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth - this.margin - 20, footerY);
    }
  }

  private addSeparator(): void {
    this.doc.setDrawColor(200);
    this.doc.line(this.margin, this.yPosition, this.pageWidth - this.margin, this.yPosition);
    this.yPosition += 5;
  }

  save(filename: string): void {
    this.doc.save(filename);
  }

  getBlob(): Blob {
    return this.doc.output('blob');
  }
}

// Utility function to generate a complete game report
export async function exportGameReport(data: GameReportData): Promise<void> {
  const exporter = new PDFExporter();
  await exporter.generateGameReport(data);

  const filename = `${data.team.name}_vs_${data.opponent}_${new Date(data.game.date).toISOString().split('T')[0]}.pdf`;
  exporter.save(filename);
}

// Utility function to prepare report data from game and shots
export function prepareGameReportData(
  game: Game,
  team: Team,
  season: Season,
  shots: Shot[],
  insights: string[] = []
): GameReportData {
  const shotStats = {
    totalShots: shots.length,
    goals: shots.filter(s => s.result === 'goal').length,
    saves: shots.filter(s => s.result === 'save').length,
    misses: shots.filter(s => s.result === 'miss').length,
    blocked: shots.filter(s => s.result === 'blocked').length,
    goalPercentage: shots.length > 0 ? (shots.filter(s => s.result === 'goal').length / shots.length) * 100 : 0
  };

  // Calculate period breakdown
  const periods = Math.max(3, game.periods || 3);
  const periodBreakdown = Array.from({ length: periods }, (_, i) => {
    const period = i + 1;
    const periodShots = shots.filter(s => s.period === period);
    return {
      period,
      shots: periodShots.length,
      goals: periodShots.filter(s => s.result === 'goal').length
    };
  });

  return {
    game,
    team,
    season,
    shots,
    opponent: game.awayTeamName,
    finalScore: {
      home: game.homeScore || 0,
      away: game.awayScore || 0
    },
    shotStats,
    periodBreakdown,
    insights
  };
}