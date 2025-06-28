defmodule AstrupWeb.ParameterGuideLive do
  @moduledoc """
  Interactive parameter guide that allows users to click on parameters
  to see detailed descriptions and information.
  """
  use AstrupWeb, :live_view

  def mount(_, _, socket) do
    analyzer = Astrup.Analyzer.RadiometerAbl90FlexPlus

    sample_number = Enum.random(10000..99999)

    random_minutes = Enum.random(-60..-2)

    sample_date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)

    printed_date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)
      |> DateTime.add(2, :minute)

    socket =
      socket
      |> assign(sample_number: sample_number)
      |> assign(sample_date: sample_date)
      |> assign(printed_date: printed_date)
      |> assign(:printout, normal_values_printout())
      |> assign(:lab_module, Astrup.Lab.Fimlab)
      |> assign(:age_range, "31-50")
      |> assign(:sex, "female")
      |> assign(:analyzer, analyzer)
      |> assign(:selected_parameter, nil)

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 class="text-xl sm:text-2xl font-semibold mb-4 sm:mb-0">
            {gettext("Parameter Guide")}
          </h1>
          
          <div class="flex gap-2">
            <a href="/quiz" class="btn btn-outline btn-sm">
              {gettext("Quiz Mode")}
            </a>
            <span class="btn btn-primary btn-sm">
              {gettext("Learning Mode")}
            </span>
          </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
          <!-- Printout Section -->
          <div class="w-full lg:flex-1">
            <AstrupWeb.Components.RadiometerABL90FlexPlus.render
              printout={@printout}
              selections={%{}}
              state={:ready}
              hints_enabled={false}
              get_reference_range={
                fn parameter ->
                  Astrup.pretty_print_reference_range(@lab_module, parameter, %{
                    age_range: @age_range,
                    sex: @sex
                  })
                end
              }
              get_unit={fn parameter -> @analyzer.get_unit_by_parameter(parameter) end}
              sample_date={@sample_date}
              printed_date={@printed_date}
              quiz?={false}
              explorer?={true}
            />
          </div>
          
    <!-- Description Section -->
          <div class="w-full lg:flex-1 lg:sticky lg:top-4 lg:self-start">
            <div class="border border-base-content/20 shadow-lg p-8 min-h-96">
              <%= if @selected_parameter do %>
                <h2 class="text-lg font-semibold mb-4 text-primary">
                  {parameter_name(@selected_parameter)}
                </h2>
                <div class="prose prose-li:my-0">
                  {Phoenix.HTML.raw(render_markdown(parameter_description(@selected_parameter)))}
                </div>
              <% else %>
                <div class="text-center text-base-content/60 mt-12">
                  <div class="text-6xl mb-4">📋</div>
                  <h2 class="text-lg font-semibold mb-2">
                    {gettext("Click on a parameter")}
                  </h2>
                  <p>
                    {gettext("Click on any parameter in the printout to learn more about it.")}
                  </p>
                </div>
              <% end %>
            </div>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end

  def handle_event("select_parameter", %{"parameter" => parameter}, socket) do
    parameter_atom = String.to_atom(parameter)
    {:noreply, assign(socket, :selected_parameter, parameter_atom)}
  end

  defp render_markdown(text) do
    case Earmark.as_html(text) do
      {:ok, html, _} -> html
      {:error, _, _} -> text
    end
  end

  defp normal_values_printout do
    %{
      id: "12345",
      ph: 7.40,
      # 40 mmHg = ~5.3 kPa
      pco2: 5.3,
      # 85 mmHg = ~11.3 kPa
      po2: 11.3,
      # mmol/L
      bicarbonate: 24.0,
      # mmol/L
      base_excess: 0.0,
      # mmol/L
      anion_gap: 10.0,
      # g/L (14.5 g/dL = 145 g/L)
      hemoglobin: 145,
      # Vol%
      oxygen_content: 19.5,
      # %
      oxygen_saturation: 98.0,
      # %
      carboxyhemoglobin: 1.0,
      # %
      methemoglobin: 1.0,
      # mmol/L
      potassium: 4.0,
      # mmol/L
      sodium: 140.0,
      # mmol/L
      ionized_calcium: 1.25,
      # mmol/L
      ionized_calcium_corrected_to_ph_7_4: 1.25,
      # mmol/L
      chloride: 105.0,
      # mmol/L (90 mg/dL = ~5.0 mmol/L)
      glucose: 5.0,
      # mmol/L
      lactate: 1.5
    }
  end

  defp parameter_name(parameter) do
    case parameter do
      :ph -> "pH (Potential of Hydrogen)"
      :pco2 -> "pCO₂ (Partial Pressure of Carbon Dioxide)"
      :po2 -> "pO₂ (Partial Pressure of Oxygen)"
      :bicarbonate -> "HCO₃⁻ (Bicarbonate)"
      :base_excess -> "Base Excess"
      :anion_gap -> "Anion Gap"
      :hemoglobin -> "Hemoglobin (Hb)"
      :oxygen_content -> "Oxygen Content"
      :oxygen_saturation -> "Oxygen Saturation (sO₂)"
      :carboxyhemoglobin -> "Carboxyhemoglobin (COHb)"
      :methemoglobin -> "Methemoglobin (MetHb)"
      :potassium -> "Potassium (K⁺)"
      :sodium -> "Sodium (Na⁺)"
      :ionized_calcium -> "Ionized Calcium (Ca²⁺)"
      :ionized_calcium_corrected_to_ph_7_4 -> "Ionized Calcium Corrected to pH 7.4"
      :chloride -> "Chloride (Cl⁻)"
      :glucose -> "Glucose"
      :lactate -> "Lactate"
      _ -> "Unknown Parameter"
    end
  end

  defp parameter_description(parameter) do
    case parameter do
      :ph ->
        """
        pH measures the hydrogen ion concentration in blood and indicates acid-base balance.

        #### Clinical Significance

        - Low pH is associated with acidosis
        - High pH is associated with alkalosis
        - Normal arterial blood pH ranges from 7.35-7.45

        #### Key Points

        - Critical for enzyme function and metabolic processes
        - Tightly regulated by respiratory and renal systems
        - Compatible with life: 6.8-7.8
        - Small changes have significant physiological effects
        """

      :pco2 ->
        """
        Partial pressure of carbon dioxide reflects the respiratory component of acid-base balance and indicates pulmonary ventilation adequacy.

        #### Clinical Significance

        - Measures pressure of CO₂ dissolved in blood plasma
        - Normal range: 4.7-6.0 kPa (35-45 mmHg)
        - Hypercapnia: pCO₂ > 6.0 kPa (respiratory acidosis)
        - Hypocapnia: pCO₂ < 4.7 kPa (respiratory alkalosis)

        #### Physiology

        - Regulated by ventilation
        - Primary respiratory buffer system
        - Immediate response to acid-base disturbances
        """

      :po2 ->
        """
        Partial pressure of oxygen reflects oxygen uptake in the lungs and indicates oxygen transfer in the respiratory system.

        #### Clinical Significance

        - Normal range: 10.7-13.3 kPa (80-100 mmHg)
        - Hypoxemia: pO₂ < 10.7 kPa (80 mmHg)
        - Severe hypoxemia: pO₂ < 8.0 kPa (60 mmHg)

        #### Important Notes

        - Only 1-2% of oxygen is dissolved in blood plasma ¹
        - Most oxygen is bound to hemoglobin
        - Decreases with age and altitude
        - Independent of hemoglobin concentration

        <footer class="mt-6 pt-4 border-t border-base-content/20 text-xs text-base-content/70">
        ¹ Radiometer ABL90 FLEX PLUS technical specifications
        </footer>
        """

      :bicarbonate ->
        """
        Bicarbonate is the major buffer in blood and represents the metabolic component of acid-base balance. Normal range is 22-26 mmol/L.


        #### Clinical Interpretation

        - Metabolic acidosis: HCO₃⁻ < 22 mmol/L
        - Metabolic alkalosis: HCO₃⁻ > 26 mmol/L


        #### Buffer System

        The bicarbonate buffer system is the most important extracellular buffer:

        - CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻
        - Regulated by the kidneys (slow, 24-48 hours)
        - Accounts for ~75% of blood buffering capacity
        """

      :base_excess ->
        """
        Base excess represents the amount of acid or base needed to normalize blood pH to 7.40 at standard conditions. Normal range is -2 to +2 mEq/L.

        - **Negative base excess**: Metabolic acidosis
        - **Positive base excess**: Metabolic alkalosis

        Base excess is independent of respiratory compensation and reflects pure metabolic disturbances.
        """

      :anion_gap ->
        """
        Anion gap represents unmeasured anions in blood and helps classify metabolic acidosis. Normal range is 8-12 mEq/L.

        - **High anion gap**: Suggests organic acid accumulation
        - **Normal anion gap**: Suggests bicarbonate loss or chloride retention

        Calculated as: (Na⁺ + K⁺) - (Cl⁻ + HCO₃⁻)
        """

      :hemoglobin ->
        """
        Hemoglobin is the oxygen-carrying protein in red blood cells. Normal ranges vary by sex and age.

        - **Men**: 13.8-17.2 g/dL
        - **Women**: 12.1-15.1 g/dL

        Hemoglobin levels affect oxygen delivery capacity and are crucial for tissue oxygenation.
        """

      :oxygen_saturation ->
        """
        Oxygen saturation represents the percentage of hemoglobin bound to oxygen. Normal arterial saturation is 95-100%.

        - **Hypoxemia**: sO₂ < 95%
        - **Severe hypoxemia**: sO₂ < 90%

        Oxygen saturation follows the oxygen-hemoglobin dissociation curve and is affected by pH, temperature, and 2,3-DPG.
        """

      :potassium ->
        """
        Potassium is the major intracellular cation that regulates neuromuscular excitability.

        #### Clinical Significance

        - Normal range: 3.5-5.0 mmol/L
        - Hypokalemia: K⁺ < 3.5 mmol/L (cardiac arrhythmias, muscle weakness)
        - Hyperkalemia: K⁺ > 5.0 mmol/L (cardiac arrest risk)

        #### Physiology

        - Major intracellular cation
        - Crucial for cardiac rhythm and muscle function
        - Regulates neuromuscular excitability
        - Levels affected by pH, insulin, and kidney function
        """

      :sodium ->
        """
        Sodium is the dominant extracellular cation that controls water balance and blood pressure.

        #### Clinical Significance

        - **Normal range**: 136-145 mmol/L
        - **Hyponatremia**: Na⁺ < 136 mmol/L (confusion, seizures)
        - **Hypernatremia**: Na⁺ > 145 mmol/L (dehydration, altered mental status)

        #### Physiology

        - Dominant extracellular cation
        - Controls water balance and blood pressure
        - Regulated by the kidneys
        - Affects water distribution between compartments
        """

      :ionized_calcium ->
        """
        Ionized calcium is vital for bone mineralization and crucial for cellular processes.

        #### Clinical Significance

        - **Normal range**: 1.15-1.35 mmol/L
        - **Hypocalcemia**: Ca²⁺ < 1.15 mmol/L (tetany, seizures)
        - **Hypercalcemia**: Ca²⁺ > 1.35 mmol/L (kidney stones, confusion)

        #### Physiology

        - Physiologically active form of calcium
        - Vital for bone mineralization
        - Crucial for cellular processes and muscle contraction
        - Regulated by parathyroid hormone and vitamin D
        """

      :ionized_calcium_corrected_to_ph_7_4 ->
        """
        Ionized calcium corrected to pH 7.4 provides a standardized measurement independent of patient's actual pH.

        #### Clinical Significance

        - **Normal range**: 1.15-1.35 mmol/L (corrected to pH 7.4)
        - Eliminates pH effect on calcium binding
        - More accurate assessment of calcium status

        #### Technical Notes

        - Corrects for pH-dependent protein binding
        - Standard reference for calcium interpretation
        - Used when patient pH differs significantly from 7.4
        """

      :chloride ->
        """
        Chloride is the major extracellular fluid anion that maintains osmotic pressure and fluid balance.

        #### Clinical Significance

        - **Normal range**: 98-107 mmol/L
        - **Hypochloremia**: Cl⁻ < 98 mmol/L
        - **Hyperchloremia**: Cl⁻ > 107 mmol/L

        #### Physiology

        - Major extracellular fluid anion
        - Maintains osmotic pressure and fluid balance
        - Works with sodium to regulate fluid distribution
        - Important component of anion gap calculation
        """

      :glucose ->
        """
        Glucose is the major intracellular energy source, produced via gluconeogenesis and glycogen breakdown.

        #### Clinical Significance

        - **Normal fasting range**: 3.9-5.6 mmol/L (70-100 mg/dL)
        - **Hypoglycemia**: < 3.9 mmol/L (< 70 mg/dL)
        - **Hyperglycemia**: > 7.8 mmol/L (> 140 mg/dL)

        #### Physiology

        - Primary cellular fuel source
        - Regulated by insulin, glucagon, and other hormones
        - Critical for brain and red blood cell metabolism
        - Produced through gluconeogenesis and glycogen breakdown
        """

      :lactate ->
        """
        Lactate is produced during anaerobic energy production and formed from pyruvate in intracellular fluid.

        #### Clinical Significance

        - **Normal range**: 0.5-2.2 mmol/L
        - **Hyperlactatemia**: > 2.2 mmol/L
        - **Lactic acidosis**: > 4.0 mmol/L with acidosis

        #### Physiology

        - Produced during anaerobic metabolism
        - Formed from pyruvate in intracellular fluid
        - Indicates tissue hypoxia or metabolic stress
        - Elevated levels suggest inadequate oxygen delivery or utilization
        """

      _ ->
        """
        Information for this parameter is not yet available. Try clicking on other parameters for detailed descriptions.
        """
    end
  end
end
