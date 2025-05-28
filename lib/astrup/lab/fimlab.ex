defmodule Astrup.Lab.Fimlab do
  @behaviour Astrup.Lab

  @impl Astrup.Lab
  def get_reference_range(parameter, %{age_range: age_range, sex: _sex}) do
    case parameter do
      :ph ->
        {Decimal.new("7.35"), Decimal.new("7.45"), "", :decimal}

      :pco2 ->
        {Decimal.new("4.5"), Decimal.new("6.0"), "kPa", :decimal}

      :po2 ->
        {min, max} =
          case age_range do
            "0-18" ->
              {Decimal.new("12.0"), Decimal.new("14.0")}

            "18-30" ->
              {Decimal.new("11.0"), Decimal.new("14.0")}

            # Default
            "31-50" ->
              {Decimal.new("10.3"), Decimal.new("13.0")}

            "51-60" ->
              {Decimal.new("9.7"), Decimal.new("12.7")}

            "61-70" ->
              {Decimal.new("9.3"), Decimal.new("12.3")}

            "71-80" ->
              {Decimal.new("8.8"), Decimal.new("11.9")}

            ">80" ->
              {Decimal.new("8.3"), Decimal.new("11.4")}

            _ ->
              {Decimal.new("10.3"), Decimal.new("13.0")}
          end

        {min, max, "kPa", :decimal}

      :bicarbonate ->
        {Decimal.new("22.0"), Decimal.new("27.0"), "mmol/l", :integer}

      :base_excess ->
        {Decimal.new("-3.0"), Decimal.new("3.0"), "mmol/l", :integer}

      :anion_gap ->
        {Decimal.new("8.0"), Decimal.new("16.0"), "mmol/l", :integer}

      :hemoglobin ->
        {Decimal.new("134.0"), Decimal.new("167.0"), "g/l", :integer}

      :oxygen_content ->
        {Decimal.new("18.0"), Decimal.new("23.0"), "%", :integer}

      :oxygen_saturation ->
        {Decimal.new("95.0"), Decimal.new("100.0"), "%", :integer}

      :carboxyhemoglobin ->
        {Decimal.new("0.0"), Decimal.new("2.3"), "%", :decimal}

      :methemoglobin ->
        {Decimal.new("0.0"), Decimal.new("2.0"), "%", :integer}

      :potassium ->
        {Decimal.new("3.3"), Decimal.new("4.8"), "mmol/l", :decimal}

      :sodium ->
        {Decimal.new("137.0"), Decimal.new("144.0"), "mmol/l", :integer}

      :ionized_calcium ->
        {Decimal.new("1.15"), Decimal.new("1.30"), "mmol/l", :decimal}

      :ionized_calcium_corrected_to_ph_7_4 ->
        {Decimal.new("1.15"), Decimal.new("1.30"), "mmol/l", :decimal}

      :chloride ->
        {Decimal.new("96.0"), Decimal.new("111.0"), "mmol/l", :integer}

      :glucose ->
        {Decimal.new("4.0"), Decimal.new("6.0"), "mmol/l", :integer}

      :lactate ->
        {Decimal.new("0.5"), Decimal.new("1.6"), "mmol/l", :decimal}
    end
  end
end
