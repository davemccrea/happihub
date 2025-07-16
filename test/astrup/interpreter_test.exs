defmodule Astrup.InterpreterTest do
  use ExUnit.Case
  alias Astrup.Interpreter

  describe "primary_disorder/1" do
    test "returns :normal for normal values" do
      assert Interpreter.primary_disorder(%{ph: :normal, pco2: :normal, bicarbonate: :normal}) ==
               :normal
    end

    test "returns respiratory acidosis uncompensated" do
      assert Interpreter.primary_disorder(%{ph: :low, pco2: :high, bicarbonate: :normal}) ==
               {:respiratory_acidosis, :uncompensated}
    end

    test "returns respiratory alkalosis uncompensated" do
      assert Interpreter.primary_disorder(%{ph: :high, pco2: :low, bicarbonate: :normal}) ==
               {:respiratory_alkalosis, :uncompensated}
    end

    test "returns respiratory acidosis partially compensated" do
      assert Interpreter.primary_disorder(%{ph: :low, pco2: :high, bicarbonate: :high}) ==
               {:respiratory_acidosis, :partially_compensated}
    end

    test "returns respiratory alkalosis partially compensated" do
      assert Interpreter.primary_disorder(%{ph: :high, pco2: :low, bicarbonate: :low}) ==
               {:respiratory_alkalosis, :partially_compensated}
    end

    test "returns metabolic acidosis uncompensated" do
      assert Interpreter.primary_disorder(%{ph: :low, pco2: :normal, bicarbonate: :low}) ==
               {:metabolic_acidosis, :uncompensated}
    end

    test "returns metabolic alkalosis uncompensated" do
      assert Interpreter.primary_disorder(%{ph: :high, pco2: :normal, bicarbonate: :high}) ==
               {:metabolic_alkalosis, :uncompensated}
    end

    test "returns metabolic acidosis partially compensated" do
      assert Interpreter.primary_disorder(%{ph: :low, pco2: :low, bicarbonate: :low}) ==
               {:metabolic_acidosis, :partially_compensated}
    end

    test "returns metabolic alkalosis partially compensated" do
      assert Interpreter.primary_disorder(%{ph: :high, pco2: :high, bicarbonate: :high}) ==
               {:metabolic_alkalosis, :partially_compensated}
    end

    test "returns :not_determined for unknown patterns" do
      assert Interpreter.primary_disorder(%{ph: :high, pco2: :high, bicarbonate: :normal}) ==
               :not_determined

      assert Interpreter.primary_disorder(%{ph: :low, pco2: :normal, bicarbonate: :high}) ==
               :not_determined

      assert Interpreter.primary_disorder(%{ph: :normal, pco2: :high, bicarbonate: :low}) ==
               :not_determined
    end
  end

  describe "copenhagen_interpretation/3" do
    test "acute respiratory acidosis calculation" do
      # Test with pCO2 = 6.5 kPa (above normal 5.33289474)
      result =
        Interpreter.copenhagen_interpretation(
          "6.5",
          {:respiratory_acidosis, :uncompensated},
          :acute
        )

      # Expected: (6.5 - 5.33289474) * 1 = 1.16710526
      assert Decimal.equal?(result, Decimal.new("1.16710526"))
    end

    test "chronic respiratory acidosis calculation" do
      # Test with pCO2 = 7.0 kPa
      result =
        Interpreter.copenhagen_interpretation(
          "7.0",
          {:respiratory_acidosis, :partially_compensated},
          :chronic
        )

      # Expected: (7.0 - 5.33289474) * 4 = 6.66842104
      assert Decimal.equal?(result, Decimal.new("6.66842104"))
    end

    test "acute respiratory alkalosis calculation" do
      # Test with pCO2 = 4.0 kPa (below normal 5.33289474)
      result =
        Interpreter.copenhagen_interpretation(
          "4.0",
          {:respiratory_alkalosis, :uncompensated},
          :acute
        )

      # Expected: (4.0 - 5.33289474) * 2 = -2.66578948
      assert Decimal.equal?(result, Decimal.new("-2.66578948"))
    end

    test "chronic respiratory alkalosis calculation" do
      # Test with pCO2 = 3.5 kPa
      result =
        Interpreter.copenhagen_interpretation(
          "3.5",
          {:respiratory_alkalosis, :partially_compensated},
          :chronic
        )

      # Expected: (3.5 - 5.33289474) * 5 = -9.1644737
      assert Decimal.equal?(result, Decimal.new("-9.1644737"))
    end

    test "returns nil for non-respiratory disorders" do
      assert Interpreter.copenhagen_interpretation(
               5.0,
               {:metabolic_acidosis, :uncompensated},
               :acute
             ) == nil

      assert Interpreter.copenhagen_interpretation(
               5.0,
               {:metabolic_alkalosis, :partially_compensated},
               :chronic
             ) == nil

      assert Interpreter.copenhagen_interpretation(5.0, :normal, :acute) == nil
    end

    test "returns nil for unknown disorders" do
      assert Interpreter.copenhagen_interpretation(
               5.0,
               {:unknown_disorder, :uncompensated},
               :acute
             ) == nil

      assert Interpreter.copenhagen_interpretation(5.0, :not_determined, :chronic) == nil
    end

    test "handles decimal inputs correctly" do
      result =
        Interpreter.copenhagen_interpretation(
          "5.83",
          {:respiratory_acidosis, :uncompensated},
          :acute
        )

      # Expected: (5.83 - 5.33289474) * 1 = 0.49710526
      assert Decimal.equal?(result, Decimal.new("0.49710526"))
    end

    test "handles string inputs correctly" do
      result =
        Interpreter.copenhagen_interpretation(
          "6.0",
          {:respiratory_acidosis, :uncompensated},
          :acute
        )

      # Expected: (6.0 - 5.33289474) * 1 = 0.66710526
      assert Decimal.equal?(result, Decimal.new("0.66710526"))
    end

    test "baseline calculation with normal pCO2" do
      # Test with pCO2 at normal value
      result =
        Interpreter.copenhagen_interpretation(
          "5.33289474",
          {:respiratory_acidosis, :uncompensated},
          :acute
        )

      # Expected: (5.33289474 - 5.33289474) * 1 = 0
      assert Decimal.equal?(result, Decimal.new("0"))
    end
  end
end
