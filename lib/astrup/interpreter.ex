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
end
