export type TMonthName = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';

export interface TChartItem {
  month: TMonthName;
  earning?: number;
  totalUsers?: number;
}

export interface TOverviewStats {
  totalTherapist: number;
  totalEarning: number;
  totalEvent: number;
  totalConsultation: {
    count: number;
    growthPercentage: string;
  };
  totalEarningOverview: TChartItem[];
  usersGrowthMatrix: TChartItem[];
}
