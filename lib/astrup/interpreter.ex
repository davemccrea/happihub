defmodule Astrup.Interpreter do
  def primary_disorder(%{ph: ph, pco2: pco2, bicarbonate: bicarbonate}) do
    case {ph, pco2, bicarbonate} do
      {:normal, :normal, :normal} ->
        :normal

      # pCO2 is primary contribution to pH change, no compensation
      {:low, :high, :normal} ->
        {:respiratory_acidosis, :uncompensated}

      {:high, :low, :normal} ->
        {:respiratory_alkalosis, :uncompensated}

      # pCO2 is primary contribution to pH change, partial compensation
      {:low, :high, :high} ->
        {:respiratory_acidosis, :partially_compensated}

      {:high, :low, :low} ->
        {:respiratory_alkalosis, :partially_compensated}

      # Bicarbonate is primary contribution to pH change, no compensation
      {:low, :normal, :low} ->
        {:metabolic_acidosis, :uncompensated}

      {:high, :normal, :high} ->
        {:metabolic_alkalosis, :uncompensated}

      # Bicarbonate is primary contribution to pH change, partial compensation
      {:low, :low, :low} ->
        {:metabolic_acidosis, :partially_compensated}

      {:high, :high, :high} ->
        {:metabolic_alkalosis, :partially_compensated}

      # Full compensation
      {:normal, :low, :high} ->
        :not_determined

      {:normal, :high, :low} ->
        :not_determined

      _ ->
        :not_determined
    end
  end

  def assess_compensation({_, :partially_compensated}) do
  end

  # Could be fully compensated or mixed
  def assess_compensation(:not_determined) do
  end

  def assess_compensation(x), do: x

  def copenhagen_interpretation(pco2, disorder, acuity) do
    case {disorder, acuity} do
      # For acute respiratory acidosis, BE is expected to rise by approx 1 mmol/L for every 0.133 kPa increase in pCO2 above 5.33 kPa
      {{:respiratory_acidosis, _compensation}, :acute} ->
        pco2
        |> Decimal.new()
        |> Decimal.sub("5.33289474")
        |> Decimal.mult("1")

      # For chronic respiratory acidosis, BE is expected to rise by approx 3.5-4 mmol/L for every 0.133 kPa increase in pCO2 above 5.33 kPa
      {{:respiratory_acidosis, _compensation}, :chronic} ->
        pco2
        |> Decimal.new()
        |> Decimal.sub("5.33289474")
        |> Decimal.mult("4")

      # For acute respiratory alkalosis, BE is expected to fall by approx 2 mmol/L for every 0.133 kPa decrease in pCO2 below 5.33 kPa
      {{:respiratory_alkalosis, _compensation}, :acute} ->
        pco2
        |> Decimal.new()
        |> Decimal.sub("5.33289474")
        |> Decimal.mult("2")

      # For chronic respiratory alkalosis, BE is expected to fall by approx 5 mmol/L for every 0.133 kPa decrease in pCO2 below 5.33 kPa
      {{:respiratory_alkalosis, _compensation}, :chronic} ->
        pco2
        |> Decimal.new()
        |> Decimal.sub("5.33289474")
        |> Decimal.mult("5")

      _ ->
        nil
    end
  end

  def get_correct_parameter_classifications(case_data) do
    context = %{age_range: get_age_range(case_data.age), sex: case_data.sex}
    
    checks = Astrup.check_values_against_reference_range(
      Astrup.Lab.Fimlab,
      %{
        ph: case_data.ph,
        pco2: case_data.pco2,
        bicarbonate: case_data.bicarbonate
      },
      context
    )
    
    %{
      ph: convert_ph_classification(checks.ph),
      pco2: convert_respiratory_classification(checks.pco2),
      bicarbonate: convert_metabolic_classification(checks.bicarbonate)
    }
  end

  def get_age_range(age) do
    cond do
      age <= 18 -> "0-18"
      age <= 30 -> "18-30"
      age <= 50 -> "31-50"
      age <= 60 -> "51-60"
      age <= 70 -> "61-70"
      age <= 80 -> "71-80"
      true -> ">80"
    end
  end

  def convert_ph_classification(:low), do: :acidosis
  def convert_ph_classification(:normal), do: :normal
  def convert_ph_classification(:high), do: :alkalosis

  def convert_respiratory_classification(:low), do: :alkalosis
  def convert_respiratory_classification(:normal), do: :normal
  def convert_respiratory_classification(:high), do: :acidosis

  def convert_metabolic_classification(:low), do: :acidosis
  def convert_metabolic_classification(:normal), do: :normal
  def convert_metabolic_classification(:high), do: :alkalosis
end
