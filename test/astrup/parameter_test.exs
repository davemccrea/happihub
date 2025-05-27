defmodule Astrup.ParameterTest do
  use ExUnit.Case, async: true
  alias Astrup.Parameter

  describe "check_value_against_reference_range/2" do
    test "returns :high for :ph when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:ph, Decimal.new("7.50")) == :high
    end

    test "returns :low for :ph when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:ph, Decimal.new("7.30")) == :low
    end

    test "returns :normal for :ph when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:ph, Decimal.new("7.35")) == :normal
    end

    test "returns :normal for :ph when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:ph, Decimal.new("7.45")) == :normal
    end

    test "returns :normal for :ph when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:ph, Decimal.new("7.40")) == :normal
    end

    # Test with a parameter that has an integer display_type
    test "returns :high for :bicarbonate when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:bicarbonate, Decimal.new("30.0")) ==
               :high
    end

    test "returns :low for :bicarbonate when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:bicarbonate, Decimal.new("20.0")) ==
               :low
    end

    test "returns :normal for :bicarbonate when value is within reference range" do
      assert Parameter.check_value_against_reference_range(:bicarbonate, Decimal.new("25.0")) ==
               :normal
    end

    # Test with a parameter that has a decimal display_type
    test "returns :high for :pco2 when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:pco2, Decimal.new("6.5")) == :high
    end

    test "returns :low for :pco2 when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:pco2, Decimal.new("4.0")) == :low
    end

    test "returns :normal for :pco2 when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:pco2, Decimal.new("4.5")) == :normal
    end

    test "returns :normal for :pco2 when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:pco2, Decimal.new("6.0")) == :normal
    end

    test "returns :normal for :pco2 when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:pco2, Decimal.new("5.0")) == :normal
    end

    # Test with a parameter that has an integer display_type
    test "returns :high for :base_excess when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:base_excess, Decimal.new("4.0")) ==
               :high
    end

    test "returns :low for :base_excess when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:base_excess, Decimal.new("-4.0")) ==
               :low
    end

    test "returns :normal for :base_excess when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:base_excess, Decimal.new("-3.0")) ==
               :normal
    end

    test "returns :normal for :base_excess when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:base_excess, Decimal.new("3.0")) ==
               :normal
    end

    test "returns :normal for :base_excess when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:base_excess, Decimal.new("0.0")) ==
               :normal
    end

    # Tests for :po2 (decimal)
    test "returns :high for :po2 when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:po2, Decimal.new("13.1")) == :high
    end

    test "returns :low for :po2 when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:po2, Decimal.new("10.2")) == :low
    end

    test "returns :normal for :po2 when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:po2, Decimal.new("10.3")) == :normal
    end

    test "returns :normal for :po2 when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:po2, Decimal.new("13.0")) == :normal
    end

    test "returns :normal for :po2 when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:po2, Decimal.new("11.65")) == :normal
    end

    # Tests for :anion_gap (integer)
    test "returns :high for :anion_gap when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:anion_gap, Decimal.new("17.0")) ==
               :high
    end

    test "returns :low for :anion_gap when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:anion_gap, Decimal.new("7.0")) == :low
    end

    test "returns :normal for :anion_gap when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:anion_gap, Decimal.new("8.0")) ==
               :normal
    end

    test "returns :normal for :anion_gap when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:anion_gap, Decimal.new("16.0")) ==
               :normal
    end

    test "returns :normal for :anion_gap when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:anion_gap, Decimal.new("12.0")) ==
               :normal
    end

    # Tests for :hemoglobin (integer)
    test "returns :high for :hemoglobin when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:hemoglobin, Decimal.new("168.0")) ==
               :high
    end

    test "returns :low for :hemoglobin when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:hemoglobin, Decimal.new("133.0")) ==
               :low
    end

    test "returns :normal for :hemoglobin when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:hemoglobin, Decimal.new("134.0")) ==
               :normal
    end

    test "returns :normal for :hemoglobin when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:hemoglobin, Decimal.new("167.0")) ==
               :normal
    end

    test "returns :normal for :hemoglobin when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:hemoglobin, Decimal.new("150.5")) ==
               :normal
    end

    # Tests for :oxygen_content (integer)
    test "returns :high for :oxygen_content when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:oxygen_content, Decimal.new("24.0")) ==
               :high
    end

    test "returns :low for :oxygen_content when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:oxygen_content, Decimal.new("17.0")) ==
               :low
    end

    test "returns :normal for :oxygen_content when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:oxygen_content, Decimal.new("18.0")) ==
               :normal
    end

    test "returns :normal for :oxygen_content when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:oxygen_content, Decimal.new("23.0")) ==
               :normal
    end

    test "returns :normal for :oxygen_content when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:oxygen_content, Decimal.new("20.5")) ==
               :normal
    end

    # Tests for :oxygen_saturation (integer)
    test "returns :high for :oxygen_saturation when value is above reference range" do
      assert Parameter.check_value_against_reference_range(
               :oxygen_saturation,
               Decimal.new("101.0")
             ) == :high
    end

    test "returns :low for :oxygen_saturation when value is below reference range" do
      assert Parameter.check_value_against_reference_range(
               :oxygen_saturation,
               Decimal.new("94.0")
             ) == :low
    end

    test "returns :normal for :oxygen_saturation when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(
               :oxygen_saturation,
               Decimal.new("95.0")
             ) == :normal
    end

    test "returns :normal for :oxygen_saturation when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(
               :oxygen_saturation,
               Decimal.new("100.0")
             ) == :normal
    end

    test "returns :normal for :oxygen_saturation when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(
               :oxygen_saturation,
               Decimal.new("97.5")
             ) == :normal
    end

    # Tests for :carboxyhemoglobin (decimal)
    test "returns :high for :carboxyhemoglobin when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:carboxyhemoglobin, Decimal.new("2.4")) ==
               :high
    end

    test "returns :low for :carboxyhemoglobin when value is below reference range" do
      # Note: Lower bound is 0.0, so a "low" value would be negative, which might not be realistic.
      # Testing with -0.1, assuming the function handles negative inputs gracefully if it's possible.
      # If values are always non-negative, this specific test case might need adjustment based on domain logic.
      assert Parameter.check_value_against_reference_range(
               :carboxyhemoglobin,
               Decimal.new("-0.1")
             ) == :low
    end

    test "returns :normal for :carboxyhemoglobin when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:carboxyhemoglobin, Decimal.new("0.0")) ==
               :normal
    end

    test "returns :normal for :carboxyhemoglobin when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:carboxyhemoglobin, Decimal.new("2.3")) ==
               :normal
    end

    test "returns :normal for :carboxyhemoglobin when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(
               :carboxyhemoglobin,
               Decimal.new("1.15")
             ) == :normal
    end

    # Tests for :methemoglobin (integer)
    test "returns :high for :methemoglobin when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:methemoglobin, Decimal.new("3.0")) ==
               :high
    end

    test "returns :low for :methemoglobin when value is below reference range" do
      # Note: Lower bound is 0.0.
      assert Parameter.check_value_against_reference_range(:methemoglobin, Decimal.new("-1.0")) ==
               :low
    end

    test "returns :normal for :methemoglobin when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:methemoglobin, Decimal.new("0.0")) ==
               :normal
    end

    test "returns :normal for :methemoglobin when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:methemoglobin, Decimal.new("2.0")) ==
               :normal
    end

    test "returns :normal for :methemoglobin when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:methemoglobin, Decimal.new("1.0")) ==
               :normal
    end

    # Tests for :potassium (decimal)
    test "returns :high for :potassium when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:potassium, Decimal.new("4.9")) ==
               :high
    end

    test "returns :low for :potassium when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:potassium, Decimal.new("3.2")) == :low
    end

    test "returns :normal for :potassium when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:potassium, Decimal.new("3.3")) ==
               :normal
    end

    test "returns :normal for :potassium when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:potassium, Decimal.new("4.8")) ==
               :normal
    end

    test "returns :normal for :potassium when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:potassium, Decimal.new("4.05")) ==
               :normal
    end

    # Tests for :sodium (integer)
    test "returns :high for :sodium when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:sodium, Decimal.new("145.0")) == :high
    end

    test "returns :low for :sodium when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:sodium, Decimal.new("136.0")) == :low
    end

    test "returns :normal for :sodium when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:sodium, Decimal.new("137.0")) ==
               :normal
    end

    test "returns :normal for :sodium when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:sodium, Decimal.new("144.0")) ==
               :normal
    end

    test "returns :normal for :sodium when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:sodium, Decimal.new("140.5")) ==
               :normal
    end

    # Tests for :ionized_calcium (decimal)
    test "returns :high for :ionized_calcium when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:ionized_calcium, Decimal.new("1.31")) ==
               :high
    end

    test "returns :low for :ionized_calcium when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:ionized_calcium, Decimal.new("1.14")) ==
               :low
    end

    test "returns :normal for :ionized_calcium when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:ionized_calcium, Decimal.new("1.15")) ==
               :normal
    end

    test "returns :normal for :ionized_calcium when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:ionized_calcium, Decimal.new("1.30")) ==
               :normal
    end

    test "returns :normal for :ionized_calcium when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:ionized_calcium, Decimal.new("1.225")) ==
               :normal
    end

    # Tests for :ionized_calcium_corrected_to_ph_7_4 (decimal)
    test "returns :high for :ionized_calcium_corrected_to_ph_7_4 when value is above reference range" do
      assert Parameter.check_value_against_reference_range(
               :ionized_calcium_corrected_to_ph_7_4,
               Decimal.new("1.31")
             ) == :high
    end

    test "returns :low for :ionized_calcium_corrected_to_ph_7_4 when value is below reference range" do
      assert Parameter.check_value_against_reference_range(
               :ionized_calcium_corrected_to_ph_7_4,
               Decimal.new("1.14")
             ) == :low
    end

    test "returns :normal for :ionized_calcium_corrected_to_ph_7_4 when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(
               :ionized_calcium_corrected_to_ph_7_4,
               Decimal.new("1.15")
             ) == :normal
    end

    test "returns :normal for :ionized_calcium_corrected_to_ph_7_4 when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(
               :ionized_calcium_corrected_to_ph_7_4,
               Decimal.new("1.30")
             ) == :normal
    end

    test "returns :normal for :ionized_calcium_corrected_to_ph_7_4 when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(
               :ionized_calcium_corrected_to_ph_7_4,
               Decimal.new("1.225")
             ) == :normal
    end

    # Tests for :chloride (integer)
    test "returns :high for :chloride when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:chloride, Decimal.new("112.0")) ==
               :high
    end

    test "returns :low for :chloride when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:chloride, Decimal.new("95.0")) == :low
    end

    test "returns :normal for :chloride when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:chloride, Decimal.new("96.0")) ==
               :normal
    end

    test "returns :normal for :chloride when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:chloride, Decimal.new("111.0")) ==
               :normal
    end

    test "returns :normal for :chloride when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:chloride, Decimal.new("103.5")) ==
               :normal
    end

    # Tests for :glucose (integer)
    test "returns :high for :glucose when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:glucose, Decimal.new("7.0")) == :high
    end

    test "returns :low for :glucose when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:glucose, Decimal.new("3.0")) == :low
    end

    test "returns :normal for :glucose when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:glucose, Decimal.new("4.0")) ==
               :normal
    end

    test "returns :normal for :glucose when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:glucose, Decimal.new("6.0")) ==
               :normal
    end

    test "returns :normal for :glucose when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:glucose, Decimal.new("5.0")) ==
               :normal
    end

    # Tests for :lactate (decimal)
    test "returns :high for :lactate when value is above reference range" do
      assert Parameter.check_value_against_reference_range(:lactate, Decimal.new("1.7")) == :high
    end

    test "returns :low for :lactate when value is below reference range" do
      assert Parameter.check_value_against_reference_range(:lactate, Decimal.new("0.4")) == :low
    end

    test "returns :normal for :lactate when value is within reference range (lower bound)" do
      assert Parameter.check_value_against_reference_range(:lactate, Decimal.new("0.5")) ==
               :normal
    end

    test "returns :normal for :lactate when value is within reference range (upper bound)" do
      assert Parameter.check_value_against_reference_range(:lactate, Decimal.new("1.6")) ==
               :normal
    end

    test "returns :normal for :lactate when value is within reference range (middle)" do
      assert Parameter.check_value_against_reference_range(:lactate, Decimal.new("1.05")) ==
               :normal
    end
  end
end
