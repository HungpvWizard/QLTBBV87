using AssetManagement.Application.Services;
using AssetManagement.Domain.Entities;
using Xunit;

namespace AssetManagement.Tests;

public class KpiEngineTests
{
    private readonly List<KpiDefinition> _definitions = KpiEngine.GetStandardDefinitions();

    [Fact]
    public void StandardDefinitions_ShouldHave26KpisAndSumTo100Percent()
    {
        Assert.Equal(26, _definitions.Count);

        var sumWeight = _definitions.Sum(d => d.Weight);
        Assert.Equal(1.00m, sumWeight);

        var sumA = _definitions.Where(d => d.Group == "A").Sum(d => d.Weight);
        var sumB = _definitions.Where(d => d.Group == "B").Sum(d => d.Weight);
        var sumC = _definitions.Where(d => d.Group == "C").Sum(d => d.Weight);
        var sumD = _definitions.Where(d => d.Group == "D").Sum(d => d.Weight);

        Assert.Equal(0.30m, sumA);
        Assert.Equal(0.35m, sumB);
        Assert.Equal(0.20m, sumC);
        Assert.Equal(0.15m, sumD);
    }

    [Fact]
    public void CompletelyEmptyAssessment_ShouldProduceTotal4AndFailRating()
    {
        // Khi hồ sơ chưa nhập bất kỳ ô nào (G, H, I đều null)
        var lines = _definitions.Select(def =>
        {
            var res = KpiEngine.CalculateLine(
                def.Code, def.Unit, def.EvaluationDirection, def.Weight,
                def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage,
                null, null, null);

            return new KpiAssessmentLine
            {
                KpiCode = def.Code,
                Group = def.Group,
                Weight = def.Weight,
                Unit = def.Unit,
                EvaluationDirection = def.EvaluationDirection,
                ThresholdExcellent = def.ThresholdExcellent,
                ThresholdGood = def.ThresholdGood,
                ThresholdAverage = def.ThresholdAverage,
                Numerator = null,
                Denominator = null,
                ActualValue = null,
                CalculatedResult = res.CalculatedResult,
                RatingLevel = res.RatingLevel,
                Score = res.Score,
                ConvertedScore = res.ConvertedScore
            };
        }).ToList();

        var a7 = lines.First(l => l.KpiCode == "A7");
        Assert.Equal(0m, a7.CalculatedResult);
        Assert.Equal("Xuất sắc", a7.RatingLevel);
        Assert.Equal(100m, a7.Score);
        Assert.Equal(2.0m, a7.ConvertedScore);

        var c6 = lines.First(l => l.KpiCode == "C6");
        Assert.Equal(0m, c6.CalculatedResult);
        Assert.Equal("Xuất sắc", c6.RatingLevel);
        Assert.Equal(100m, c6.Score);
        Assert.Equal(2.0m, c6.ConvertedScore);

        var d1 = lines.First(l => l.KpiCode == "D1");
        Assert.Equal(0m, d1.CalculatedResult);
        Assert.Equal("Không đạt", d1.RatingLevel);
        Assert.Equal(0m, d1.Score);
        Assert.Equal(0m, d1.ConvertedScore);

        // Các KPI tỷ lệ còn lại phải có J, K, L, M rỗng (null)
        var a1 = lines.First(l => l.KpiCode == "A1");
        Assert.Null(a1.CalculatedResult);
        Assert.Null(a1.RatingLevel);
        Assert.Null(a1.Score);
        Assert.Null(a1.ConvertedScore);

        var summary = KpiEngine.CalculateAssessmentSummary(lines);
        Assert.Equal(2.0m, summary.ScoreGroupA);
        Assert.Equal(0m, summary.ScoreGroupB);
        Assert.Equal(2.0m, summary.ScoreGroupC);
        Assert.Equal(0m, summary.ScoreGroupD);
        Assert.Equal(4.0m, summary.TotalScore);
        Assert.Equal("Không đạt", summary.ScoreRating);
        Assert.True(summary.HasFailKpi); // D1 không đạt
        Assert.Equal("Có KPI không đạt – cần xem xét", summary.BlockingNote);
        Assert.Equal("Không đạt", summary.FinalRating);
    }

    [Fact]
    public void A7_EmptyVsZero_BothYieldJ0_XuatSac_M2()
    {
        var def = _definitions.First(d => d.Code == "A7");

        var resNull = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, null);

        var resZero = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 0m);

        Assert.Equal(0m, resNull.CalculatedResult);
        Assert.Equal("Xuất sắc", resNull.RatingLevel);
        Assert.Equal(100m, resNull.Score);
        Assert.Equal(2.0m, resNull.ConvertedScore);

        Assert.Equal(0m, resZero.CalculatedResult);
        Assert.Equal("Xuất sắc", resZero.RatingLevel);
        Assert.Equal(100m, resZero.Score);
        Assert.Equal(2.0m, resZero.ConvertedScore);
    }

    [Fact]
    public void D1_EmptyVsZero_BothYieldJ0_KhongDat_M0()
    {
        var def = _definitions.First(d => d.Code == "D1");

        var resNull = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, null);

        var resZero = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 0m);

        Assert.Equal(0m, resNull.CalculatedResult);
        Assert.Equal("Không đạt", resNull.RatingLevel);
        Assert.Equal(0m, resNull.Score);
        Assert.Equal(0m, resNull.ConvertedScore);

        Assert.Equal(0m, resZero.CalculatedResult);
        Assert.Equal("Không đạt", resZero.RatingLevel);
        Assert.Equal(0m, resZero.Score);
        Assert.Equal(0m, resZero.ConvertedScore);
    }

    [Fact]
    public void RatioKpi_MissingGH_OrZeroDenominator_ShouldBeNull_NoDivisionByZero()
    {
        var def = _definitions.First(d => d.Code == "A1");

        var res1 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, 100m, null);
        Assert.Null(res1.CalculatedResult);
        Assert.Null(res1.RatingLevel);

        var res2 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 99m, null, null);
        Assert.Null(res2.CalculatedResult);
        Assert.Null(res2.RatingLevel);

        var res3 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 99m, 0m, null);
        Assert.Null(res3.CalculatedResult);
        Assert.Null(res3.RatingLevel);
    }

    [Fact]
    public void A1_Thresholds_Verification()
    {
        var def = _definitions.First(d => d.Code == "A1"); // Cao hơn tốt hơn, 99 / 97 / 95, W=0.07

        // 99/100 -> J=99 -> Xuất sắc, M=7
        var r1 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 99m, 100m, null);
        Assert.Equal(99m, r1.CalculatedResult);
        Assert.Equal("Xuất sắc", r1.RatingLevel);
        Assert.Equal(100m, r1.Score);
        Assert.Equal(7.0m, r1.ConvertedScore);

        // 97/100 -> J=97 -> Tốt, M=5.95
        var r2 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 97m, 100m, null);
        Assert.Equal(97m, r2.CalculatedResult);
        Assert.Equal("Tốt", r2.RatingLevel);
        Assert.Equal(85m, r2.Score);
        Assert.Equal(5.95m, r2.ConvertedScore);

        // 95/100 -> J=95 -> Trung bình, M=4.9
        var r3 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 95m, 100m, null);
        Assert.Equal(95m, r3.CalculatedResult);
        Assert.Equal("Trung bình", r3.RatingLevel);
        Assert.Equal(70m, r3.Score);
        Assert.Equal(4.90m, r3.ConvertedScore);

        // 94.99/100 -> J=94.99 -> Không đạt, M=0
        var r4 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 94.99m, 100m, null);
        Assert.Equal(94.99m, r4.CalculatedResult);
        Assert.Equal("Không đạt", r4.RatingLevel);
        Assert.Equal(0m, r4.Score);
        Assert.Equal(0m, r4.ConvertedScore);

        // 98999/100000 -> J=98.999 -> Tốt (vì < 99)
        var r5 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 98999m, 100000m, null);
        Assert.Equal(98.999m, r5.CalculatedResult);
        Assert.Equal("Tốt", r5.RatingLevel);
    }

    [Fact]
    public void A6_Thresholds_LowerIsBetter_Verification()
    {
        var def = _definitions.First(d => d.Code == "A6"); // Thấp hơn tốt hơn, 0.1 / 0.3 / 0.5, W=0.02

        // J=0.1 -> Xuất sắc
        var r1 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 0.1m, 100m, null);
        Assert.Equal("Xuất sắc", r1.RatingLevel);

        // J=0.3 -> Tốt
        var r2 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 0.3m, 100m, null);
        Assert.Equal("Tốt", r2.RatingLevel);

        // J=0.5 -> Trung bình
        var r3 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 0.5m, 100m, null);
        Assert.Equal("Trung bình", r3.RatingLevel);

        // J=0.5001 -> Không đạt
        var r4 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 0.5001m, 100m, null);
        Assert.Equal("Không đạt", r4.RatingLevel);
    }

    [Fact]
    public void A7_Incidents_Verification()
    {
        var def = _definitions.First(d => d.Code == "A7"); // Thấp hơn tốt hơn, 0 / 1 / 2, W=0.02

        // I=1 -> Tốt, M=1.7
        var r1 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 1m);
        Assert.Equal("Tốt", r1.RatingLevel);
        Assert.Equal(1.70m, r1.ConvertedScore);

        // I=2 -> Trung bình, M=1.4
        var r2 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 2m);
        Assert.Equal("Trung bình", r2.RatingLevel);
        Assert.Equal(1.40m, r2.ConvertedScore);

        // I=3 -> Không đạt, M=0
        var r3 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 3m);
        Assert.Equal("Không đạt", r3.RatingLevel);
        Assert.Equal(0m, r3.ConvertedScore);
    }

    [Fact]
    public void C6_Incidents_NoGoodThreshold_Verification()
    {
        var def = _definitions.First(d => d.Code == "C6"); // Thấp hơn tốt hơn, 0 / 0 / 1, W=0.02

        // I=0 -> Xuất sắc (do xét <= 0 trước), M=2.0
        var r0 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 0m);
        Assert.Equal("Xuất sắc", r0.RatingLevel);
        Assert.Equal(2.0m, r0.ConvertedScore);

        // I=1 -> Trung bình (bỏ qua Tốt vì 1 <= 0 là False, 1 <= 1 là True)
        var r1 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 1m);
        Assert.Equal("Trung bình", r1.RatingLevel);
        Assert.Equal(1.40m, r1.ConvertedScore);

        // I=2 -> Không đạt
        var r2 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 2m);
        Assert.Equal("Không đạt", r2.RatingLevel);
        Assert.Equal(0m, r2.ConvertedScore);
    }

    [Fact]
    public void D1_Score_Verification()
    {
        var def = _definitions.First(d => d.Code == "D1"); // W=0.03, Điểm đánh giá (≥95, ≥85, ≥70)

        // I=95 -> L=100, M=3
        var r1 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 95m);
        Assert.Equal("Xuất sắc", r1.RatingLevel);
        Assert.Equal(100m, r1.Score);
        Assert.Equal(3.0m, r1.ConvertedScore);

        // I=85 -> L=85, M=2.55
        var r2 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 85m);
        Assert.Equal("Tốt", r2.RatingLevel);
        Assert.Equal(85m, r2.Score);
        Assert.Equal(2.55m, r2.ConvertedScore);

        // I=70 -> L=70, M=2.1
        var r3 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 70m);
        Assert.Equal("Trung bình", r3.RatingLevel);
        Assert.Equal(70m, r3.Score);
        Assert.Equal(2.10m, r3.ConvertedScore);

        // I=69.99 -> L=0, M=0
        var r4 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 69.99m);
        Assert.Equal("Không đạt", r4.RatingLevel);
        Assert.Equal(0m, r4.Score);
        Assert.Equal(0m, r4.ConvertedScore);

        // I=96 -> J=96, L=100, M=3 (M = L * D = 100 * 0.03 = 3.0, không phải 96 * 0.03)
        var r5 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, null, null, 96m);
        Assert.Equal(96m, r5.CalculatedResult);
        Assert.Equal("Xuất sắc", r5.RatingLevel);
        Assert.Equal(100m, r5.Score);
        Assert.Equal(3.0m, r5.ConvertedScore);
    }

    [Fact]
    public void B8_Thresholds_LowerIsBetter_Verification()
    {
        var def = _definitions.First(d => d.Code == "B8"); // Thấp hơn tốt hơn, 0.5 / 1.0 / 2.0, W=0.02

        var r1 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 0.5m, 100m, null);
        Assert.Equal("Xuất sắc", r1.RatingLevel);

        var r2 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 1.0m, 100m, null);
        Assert.Equal("Tốt", r2.RatingLevel);

        var r3 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 2.0m, 100m, null);
        Assert.Equal("Trung bình", r3.RatingLevel);

        var r4 = KpiEngine.CalculateLine(def.Code, def.Unit, def.EvaluationDirection, def.Weight,
            def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage, 2.0001m, 100m, null);
        Assert.Equal("Không đạt", r4.RatingLevel);
    }

    [Fact]
    public void All26KpisExcellent_ShouldTotal100_GroupScoresExact()
    {
        var lines = _definitions.Select(def =>
        {
            decimal? g = null;
            decimal? h = null;
            decimal? i = null;

            if (def.Unit == "Tỷ lệ %")
            {
                if (def.EvaluationDirection == "Cao hơn tốt hơn")
                {
                    g = def.ThresholdExcellent;
                    h = 1m; // J = ThresholdExcellent * 100, wait: if h=100, g = threshold
                    // J = G / H * 100. If G = threshold, H = 100 => J = threshold!
                    g = def.ThresholdExcellent;
                    h = 100m;
                }
                else // Thấp hơn tốt hơn
                {
                    g = def.ThresholdExcellent;
                    h = 100m;
                }
            }
            else if (def.Code == "D1")
            {
                i = 100m; // >= 95
            }
            else // Số sự cố
            {
                i = 0m;
            }

            var res = KpiEngine.CalculateLine(
                def.Code, def.Unit, def.EvaluationDirection, def.Weight,
                def.ThresholdExcellent, def.ThresholdGood, def.ThresholdAverage,
                g, h, i);

            Assert.Equal("Xuất sắc", res.RatingLevel);
            Assert.Equal(100m, res.Score);

            return new KpiAssessmentLine
            {
                KpiCode = def.Code,
                Group = def.Group,
                Weight = def.Weight,
                Numerator = g,
                Denominator = h,
                ActualValue = i,
                CalculatedResult = res.CalculatedResult,
                RatingLevel = res.RatingLevel,
                Score = res.Score,
                ConvertedScore = res.ConvertedScore
            };
        }).ToList();

        var summary = KpiEngine.CalculateAssessmentSummary(lines);

        Assert.Equal(30.0m, summary.ScoreGroupA);
        Assert.Equal(35.0m, summary.ScoreGroupB);
        Assert.Equal(20.0m, summary.ScoreGroupC);
        Assert.Equal(15.0m, summary.ScoreGroupD);
        Assert.Equal(100.0m, summary.TotalScore);
        Assert.Equal("Xuất sắc", summary.ScoreRating);
        Assert.False(summary.HasFailKpi);
        Assert.False(summary.HasSevereIncidents);
        Assert.Null(summary.BlockingNote);
        Assert.Equal("Xuất sắc", summary.FinalRating);
    }
}
