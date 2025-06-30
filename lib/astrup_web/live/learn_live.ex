defmodule AstrupWeb.LearnLive do
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
        <div class="mb-12">
          <h1 class="text-2xl sm:text-3xl font-bold text-center">
            {gettext("Learn")}
          </h1>
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
                  <div class="text-4xl mb-4">📋</div>
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
      pco2: 5.3,
      po2: 11.3,
      bicarbonate: 24.0,
      base_excess: 0.0,
      anion_gap: 10.0,
      hemoglobin: 145,
      oxygen_content: 19.5,
      oxygen_saturation: 98.0,
      carboxyhemoglobin: 1.0,
      methemoglobin: 1.0,
      potassium: 4.0,
      sodium: 140.0,
      ionized_calcium: 1.25,
      ionized_calcium_corrected_to_ph_7_4: 1.25,
      chloride: 105.0,
      glucose: 5.0,
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
        **Summary:** The pH value represents the acidity or alkalinity of the blood, which is a function of its hydrogen ion (H+) concentration. Maintaining a stable pH is crucial for normal bodily function as even minor deviations can negatively impact cellular metabolism and organ function. The body's acid-base homeostasis, a complex process involving the lungs, kidneys, and blood buffers, keeps the pH within a very narrow range (typically 7.35-7.45 for arterial blood).

        **Clinical Significance:** Measuring pH, along with pCO₂ and bicarbonate (HCO₃⁻), is essential for diagnosing and monitoring acid-base disturbances. Abnormal pH levels can indicate serious conditions like respiratory or kidney failure, diabetic ketoacidosis, or circulatory shock. It is a critical parameter in emergency and intensive care settings to guide medical interventions.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :pco2 ->
        """
        **Summary:** pCO₂ is the partial pressure of carbon dioxide (CO₂) dissolved in the blood, representing about 5% of the total CO₂. As CO₂ is an acidic gas, pCO₂ is the respiratory component of the acid-base balance and reflects the effectiveness of pulmonary ventilation. The body regulates ventilation to match CO₂ production and maintain a stable pH.

        **Clinical Significance:** pCO₂ measurement is crucial for diagnosing and monitoring acid-base disturbances, providing insight into the respiratory contribution to the patient's condition. It helps differentiate between type I and type II respiratory failure and is vital for monitoring patients on mechanical ventilation. Abnormal pCO₂ can affect the cardiovascular and central nervous systems, causing symptoms like confusion, headaches, or muscle cramps.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :po2 ->
        """
        **Summary:** pO₂ is the partial pressure of oxygen dissolved in blood plasma. Although this represents only a small fraction (1-2%) of the total oxygen in the blood, it is a key determinant of how much oxygen binds to hemoglobin. Thus, pO₂ primarily reflects the efficiency of oxygen uptake in the lungs.

        **Clinical Significance:** pO₂ is a critical parameter for assessing the adequacy of blood oxygenation and diagnosing respiratory failure. It is used to monitor the effectiveness of supplemental oxygen therapy. A pO₂(a) below 8 kPa (60 mmHg) defines respiratory failure and indicates an increased risk of tissue hypoxia.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :bicarbonate ->
        """
        **Summary:** Bicarbonate (HCO₃⁻) is the second most abundant anion in plasma and a key component of the blood's buffering system. It plays a crucial role in maintaining the body's acid-base balance by neutralizing excess acid or base. About 70-80% of the carbon dioxide produced by the body is transported in the blood as bicarbonate.

        **Clinical Significance:** Along with pH and pCO₂, bicarbonate measurement is essential for diagnosing and monitoring metabolic acid-base disturbances. Decreased bicarbonate levels can be seen in conditions like diabetic ketoacidosis or kidney failure, while increased levels can be due to prolonged vomiting or diuretic use. It is also a necessary component for calculating the anion gap.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :base_excess ->
        """
        **Summary:** Base excess (BE) is a calculated parameter that quantifies the metabolic (non-respiratory) component of an acid-base disturbance. It represents the theoretical amount of acid or base that would need to be added to a blood sample to return its pH to 7.4 at a normal pCO₂. A value of zero indicates a normal metabolic balance.

        **Clinical Significance:** Base excess is used to assess the severity of metabolic acidosis and alkalosis. A negative BE (base deficit) indicates metabolic acidosis, while a positive BE indicates metabolic alkalosis. It is also helpful in identifying metabolic compensation in patients with primary respiratory acid-base disorders.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :anion_gap ->
        """
        **Summary:** The anion gap (AG) is a calculated value representing the difference between the measured major plasma cation (sodium) and the measured major plasma anions (chloride and bicarbonate). It essentially reflects the concentration of "unmeasured" anions, such as proteins and organic acids, in the plasma.

        **Clinical Significance:** The primary use of the anion gap is in the differential diagnosis of metabolic acidosis. A "high-AG" metabolic acidosis is typically caused by the accumulation of acids like lactate or ketones, while a "normal-AG" metabolic acidosis is usually due to a loss of bicarbonate, often with a corresponding increase in chloride.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :hemoglobin ->
        """
        **Summary:** Hemoglobin (Hb) is a protein within red blood cells that is responsible for transporting the vast majority (>98%) of oxygen from the lungs to the body's tissues. Each hemoglobin molecule can bind up to four oxygen molecules. Total hemoglobin (ctHb) includes all forms of hemoglobin in the blood, including functional and dysfunctional types.

        **Clinical Significance:** Measuring hemoglobin concentration is essential for diagnosing and assessing the severity of anemia (low hemoglobin). It is also a critical parameter for calculating the total oxygen content of the blood and determining the need for red blood cell transfusions. Abnormally low hemoglobin can lead to anemic hypoxia.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :oxygen_content ->
        """
        **Summary:** Oxygen content (ctO₂) is the total amount of oxygen present in the blood. It is the sum of the oxygen dissolved in the plasma and the oxygen bound to hemoglobin. It is a calculated parameter derived from the measured values of pO₂, oxygen saturation (sO₂), and hemoglobin concentration (ctHb).

        **Clinical Significance:** Oxygen content is a key parameter for evaluating the oxygen transport capacity of the blood and assessing the risk of tissue hypoxia. A low oxygen content can be caused by a reduction in pO₂, hemoglobin, or oxygen saturation, and may necessitate supplemental oxygen therapy or blood transfusion.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :oxygen_saturation ->
        """
        **Summary:** Oxygen saturation (sO₂) is the ratio of oxyhemoglobin (hemoglobin bound to oxygen) to the total amount of functional hemoglobin (hemoglobin capable of binding oxygen). It reflects the percentage of available hemoglobin that is carrying oxygen. The relationship between sO₂ and pO₂ is described by the sigmoidal oxyhemoglobin dissociation curve.

        **Clinical Significance:** Oxygen saturation, along with pO₂, is used to assess blood oxygenation. It is particularly useful for monitoring the effectiveness of supplemental oxygen therapy. A low sO₂ indicates impaired oxygen uptake in the lungs, which can be caused by various respiratory or cardiac conditions.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :carboxyhemoglobin ->
        """
        **Summary:** Carboxyhemoglobin (COHb) is a dysfunctional form of hemoglobin that is formed when carbon monoxide (CO) binds to it. CO has an affinity for hemoglobin that is about 250 times higher than that of oxygen, and once bound, the hemoglobin can no longer carry oxygen.

        **Clinical Significance:** Measurement of COHb is the primary method for diagnosing and monitoring carbon monoxide poisoning. Increased levels of COHb reduce the oxygen-carrying capacity of the blood, leading to tissue hypoxia. Symptoms of CO poisoning range from headache and dizziness at lower levels to convulsions, coma, and death at higher concentrations.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :methemoglobin ->
        """
        **Summary:** Methemoglobin (MetHb) is a dysfunctional form of hemoglobin in which the iron ion is in the ferric (Fe³⁺) state instead of the normal ferrous (Fe²⁺) state. This change prevents the hemoglobin from binding to and transporting oxygen.

        **Clinical Significance:** Increased levels of MetHb, a condition known as methemoglobinemia, can be either inherited or acquired, with the acquired form being much more common. It is often caused by exposure to certain drugs or chemicals. The primary clinical sign is cyanosis (a bluish discoloration of the skin) that does not improve with oxygen therapy.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :potassium ->
        """
        **Summary:** Potassium (K⁺) is the major intracellular cation, with a concentration inside cells that is about 25-37 times higher than in the extracellular fluid. This concentration gradient, maintained by the Na⁺/K⁺-ATPase pump, is vital for neuromuscular excitability, heart rhythm, and maintaining cell volume.

        **Clinical Significance:** Both high (hyperkalemia) and low (hypokalemia) potassium levels can have serious consequences, particularly on the heart. Abnormal potassium levels are common in hospitalized patients and can be caused by various diseases (especially kidney disease) and medications (like diuretics).

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :sodium ->
        """
        **Summary:** Sodium (Na⁺) is the most abundant cation in the extracellular fluid and a major determinant of its osmolality. Its primary functions include regulating water balance, maintaining blood pressure, and transmitting nerve impulses.

        **Clinical Significance:** Abnormal sodium levels (dysnatremia) are common in hospitalized patients and are often a result of disturbances in water balance rather than sodium balance. Hyponatremia (low sodium) can cause cells to swell, which is particularly dangerous in the brain, while hypernatremia (high sodium) can cause cells to shrink. Both conditions can lead to significant neurological symptoms if severe.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :ionized_calcium ->
        """
        **Summary:** Ionized calcium (Ca²⁺) is the physiologically active form of calcium in the body, making up about 50% of the total calcium in the blood. It plays a vital role in numerous cellular processes, including muscle contraction, nerve signal transmission, and blood coagulation. The body tightly regulates ionized calcium levels through the actions of parathyroid hormone (PTH) and vitamin D.

        **Clinical Significance:** Both hypocalcemia (low ionized calcium) and hypercalcemia (high ionized calcium) are common in hospitalized patients, especially the critically ill, and can be life-threatening if severe. Symptoms of hypocalcemia include muscle twitching and spasms, while hypercalcemia can cause muscle weakness, constipation, and kidney stones.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :ionized_calcium_corrected_to_ph_7_4 ->
        """
        **Summary:** Ionized calcium corrected to pH 7.4 provides a standardized measurement independent of patient's actual pH. The clinical significance of correcting ionized calcium for pH is to account for the fact that changes in blood pH alter the binding of calcium to albumin.

        **Clinical Significance:** Acidosis decreases binding, increasing ionized calcium, while alkalosis increases binding, decreasing ionized calcium. Correcting to a standard pH of 7.4 allows for a more accurate assessment of the true calcium status, independent of acute pH changes.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :chloride ->
        """
        **Summary:** Chloride (Cl⁻) is the most abundant anion in the extracellular fluid. It is essential for maintaining osmotic pressure, fluid balance, and electrochemical neutrality in the plasma. It is also a key component of gastric acid and is involved in the "chloride shift," a process important for carbon dioxide transport and acid-base balance.

        **Clinical Significance:** Chloride levels often parallel sodium levels, so its measurement is most valuable in the context of acid-base disturbances, where it can deviate from sodium. It is particularly useful for differentiating between "high-AG" and "normal-AG" (hyperchloremic) metabolic acidosis.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :glucose ->
        """
        **Summary:** Glucose is the body's primary source of energy for cellular function. It is derived from dietary carbohydrates and is also produced by the body through gluconeogenesis and glycogenolysis, mainly in the liver. Blood glucose levels are tightly regulated by the pancreatic hormones insulin and glucagon.

        **Clinical Significance:** Measuring blood glucose is primarily for the diagnosis and monitoring of diabetes mellitus, a condition of chronic hyperglycemia. However, abnormal glucose levels are also common in other settings. Stress-related hyperglycemia is frequent in critically ill patients, while hypoglycemia is a significant risk for neonates and a common complication of diabetes treatment.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      :lactate ->
        """
        **Summary:** Lactate is an intracellular metabolite of glucose produced during anaerobic energy production (glycolysis). It is continuously produced by tissues like skeletal muscle and red blood cells and is cleared from the blood primarily by the liver and kidneys.

        **Clinical Significance:** Elevated blood lactate levels (hyperlactatemia) are an early and sensitive indicator of tissue hypoperfusion and an imbalance between oxygen supply and demand. It is a valuable prognostic marker in critically ill patients, particularly those with sepsis or shock, and is used to monitor the adequacy of resuscitation efforts.

        **Source:** Seeger C, Higgins C. Acute Care Testing Handbook. Brønshøj, Denmark: Radiometer Medical ApS; 2014.
        """

      _ ->
        """
        Information for this parameter is not yet available. Try clicking on other parameters for detailed descriptions.
        """
    end
  end
end
