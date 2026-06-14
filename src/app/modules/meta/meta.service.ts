import { Invoice } from "../invoice/invoice.model";
import { Report } from "../report/report.model";
import User from "../user/user-model";


const getDashboardMetaData = async () => {
  const totalUser = await User.countDocuments({ isDeleted: false });
  const totalPremiumUser = await User.countDocuments({ isPremium: true, isDeleted: false });
  const totalReport = await Report.countDocuments();
  const totalIncomeResult = await Invoice.aggregate([
    { $match: { status: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalIncome = totalIncomeResult.length > 0 ? totalIncomeResult[0].total : 0;

  return { totalUser, totalPremiumUser, totalReport, totalIncome };
};

const getUserChartData = async (year: number) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  const chartData = await User.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfYear,
          $lt: endOfYear,
        },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalUser: { $sum: 1 },
      },
    },
    {
      $project: {
        month: '$_id',
        totalUser: 1,
        _id: 0,
      },
    },
    {
      $sort: { month: 1 },
    },
  ]);

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const data = Array.from({ length: 12 }, (_, index) => ({
    month: months[index],
    totalUser:
      chartData.find((item) => item.month === index + 1)?.totalUser || 0,
  }));

  return data;
};

const MetaService = {
  getDashboardMetaData,
  getUserChartData,
};

export default MetaService;
