defmodule AstrupWeb.InterpretLive do
  @moduledoc """
  Case-based ABG interpretation quiz where users are presented with clinical scenarios
  and asked to classify parameters and provide interpretations.
  """
  use AstrupWeb, :live_view

  alias Astrup.Interpreter

  @type state :: :ready | :answering | :review

  def mount(_, _, socket) do
    socket = assign(socket, :show_reference_values, false)
    {:ok, setup_new_case(socket)}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div class="mb-12">
          <h1 class="text-2xl sm:text-3xl font-bold text-center">
            {gettext("Interpret")}
          </h1>
        </div>

        <div class="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
          <!-- Sidebar Section -->
          <div class="w-full lg:w-72 lg:sticky lg:top-4 lg:self-start space-y-4 order-1 lg:order-1">
            <section class="border border-base-content/20 shadow-lg p-4">
              <h2 class="text-lg font-semibold mb-3 text-primary">{gettext("Instructions")}</h2>
              <p class="mb-4">
                {gettext(
                  "Read the clinical case, classify each parameter, and select the most appropriate interpretation."
                )}
              </p>

              <div class="flex flex-col gap-3">
                <button
                  class="btn btn-primary gap-2 w-full"
                  phx-click="check_answers"
                  disabled={
                    @state == :review or
                      not all_selections_made?(@selections, @selected_interpretation)
                  }
                >
                  {gettext("Check Answers")}
                </button>

                <button
                  class="btn btn-secondary gap-2 w-full"
                  phx-click="next_case"
                  disabled={@state != :review}
                >
                  {gettext("Next Case")}
                  <.icon name="hero-arrow-right" class="w-4 h-4" />
                </button>
              </div>

              <div class="divider"></div>

              <.form for={%{}} phx-change="toggle_reference_values">
                <label class="label cursor-pointer">
                  <span class="label-text text-xs">{gettext("Show reference values")}</span>
                  <input
                    type="checkbox"
                    name="show_reference_values"
                    class="checkbox checkbox-sm"
                    checked={@show_reference_values}
                  />
                </label>
              </.form>
            </section>

            <%= if @state == :review do %>
              <section class="border border-base-content/20 shadow-lg p-4">
                <h2 class="text-lg font-semibold mb-3 text-primary">{gettext("Score")}</h2>
                <div class="text-center">
                  <div class="stat-value text-3xl mb-2">
                    <span class={if @score >= 3, do: "text-success", else: "text-warning"}>
                      {@score}/4
                    </span>
                  </div>
                  <div class="text-sm">
                    {score_message(@score)}
                  </div>
                </div>
              </section>
            <% end %>
          </div>
          
    <!-- Main Content Section -->
          <div class="w-full lg:flex-1 order-2 lg:order-2 space-y-6">
            <!-- Case Interpretation -->
            <div class="border border-base-content/20 shadow-lg p-6 space-y-8">
              <!-- Clinical Case -->
              <div>
                <h2 class="text-lg font-semibold mb-4 text-primary">{gettext("Clinical Case")}</h2>
                <div class="max-w-none">
                  {@case_summary}
                </div>
              </div>

              <div class="divider"></div>
              
    <!-- Interpretation -->
              <div>
                <h2 class="text-lg font-semibold mb-4 text-primary">
                  {gettext("Interpretation")}
                </h2>
                <p class="mb-4">
                  {gettext("Classify each parameter as acidosis, normal, or alkalosis:")}
                </p>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <.parameter_card
                    parameter={:ph}
                    value={@case_data.ph}
                    selection={@selections.ph}
                    disabled={@state == :review}
                    show_reference_values={@show_reference_values}
                    case_data={@case_data}
                  />
                  <.parameter_card
                    parameter={:pco2}
                    value={@case_data.pco2}
                    selection={@selections.pco2}
                    disabled={@state == :review}
                    show_reference_values={@show_reference_values}
                    case_data={@case_data}
                  />
                  <.parameter_card
                    parameter={:bicarbonate}
                    value={@case_data.bicarbonate}
                    selection={@selections.bicarbonate}
                    disabled={@state == :review}
                    show_reference_values={@show_reference_values}
                    case_data={@case_data}
                  />
                  <.parameter_display
                    parameter={:po2}
                    value={@case_data.po2}
                    show_reference_values={@show_reference_values}
                    case_data={@case_data}
                  />
                  <.parameter_display
                    parameter={:base_excess}
                    value={@case_data.base_excess}
                    show_reference_values={@show_reference_values}
                    case_data={@case_data}
                  />
                </div>
              </div>

              <div>
                <p class="mb-4">
                  {gettext("Select the most appropriate interpretation:")}
                </p>

                <.form for={%{}} phx-change="select_interpretation">
                  <select
                    name="interpretation"
                    class="select select-bordered w-full max-w-md"
                    disabled={@state == :review}
                  >
                    <option value="" selected={@selected_interpretation == nil}>
                      {gettext("Choose interpretation...")}
                    </option>
                    <option
                      :for={interpretation <- @interpretation_options}
                      value={interpretation}
                      selected={@selected_interpretation == interpretation}
                    >
                      {interpretation}
                    </option>
                  </select>
                </.form>
              </div>
            </div>
            
    <!-- Results (shown after checking answers) -->
            <%= if @state == :review do %>
              <div class="border border-base-content/20 shadow-lg p-6">
                <h2 class="text-lg font-semibold mb-4 text-primary">
                  <.icon name="hero-clipboard-document-check" class="w-5 h-5 inline mr-2" />
                  {gettext("Results")}
                </h2>
                <div class="space-y-6">
                  <div>
                    <h3 class="text-lg font-semibold mb-3">
                      {gettext("Parameter Classifications:")}
                    </h3>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <.parameter_result
                        :for={{param, user_selection} <- @selections}
                        parameter={param}
                        user_selection={user_selection}
                        correct_selection={Map.get(@correct_parameter_classifications, param)}
                        value={Map.get(@case_data, param)}
                      />
                    </div>
                  </div>
                  <div class="divider"></div>
                  <div>
                    <h3 class="text-lg font-semibold mb-3">{gettext("Interpretation:")}</h3>
                    <div class="space-y-3">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-medium">{gettext("Your answer:")}</span>
                        <div class={[
                          "badge badge-lg",
                          if(@interpretation_correct, do: "badge-success", else: "badge-error")
                        ]}>
                          {@selected_interpretation || gettext("No selection")}
                        </div>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-medium">{gettext("Correct answer:")}</span>
                        <div class="badge badge-lg badge-success">{@correct_interpretation}</div>
                      </div>
                    </div>
                  </div>
                  <div class="divider"></div>
                  <div class="text-center">
                    <h3 class="text-lg font-semibold mb-3">{gettext("Your Score:")}</h3>
                    <div class="stat-value text-4xl">
                      <span class={if @score >= 3, do: "text-success", else: "text-warning"}>
                        {@score}/4
                      </span>
                    </div>
                    <div class="stat-desc text-base mt-2">
                      {score_message(@score)}
                    </div>
                  </div>
                </div>
              </div>
            <% end %>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end

  # Parameter card component
  attr :parameter, :atom, required: true
  attr :value, :any, required: true
  attr :selection, :atom, default: nil
  attr :disabled, :boolean, default: false
  attr :show_reference_values, :boolean, default: false
  attr :case_data, :map, required: true

  def parameter_card(assigns) do
    ~H"""
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body">
        <h3 class="card-title text-sm">
          {parameter_name(@parameter)}
          <%= if @show_reference_values do %>
            <span class="text-xs font-normal text-base-content/50">
              ({get_fimlab_reference_range(@parameter, @case_data)})
            </span>
          <% end %>
        </h3>
        <div class="stat-value text-lg font-mono text-primary">
          {format_value(@value, @parameter)}
        </div>

        <div class="card-actions justify-start mt-4">
          <div class="btn-group">
            <button
              type="button"
              class={[
                "btn btn-sm",
                if(@selection == :acidosis, do: "btn-error btn-active", else: "btn-outline")
              ]}
              phx-click="select_parameter"
              phx-value-parameter={@parameter}
              phx-value-selection="acidosis"
              disabled={@disabled}
            >
              {gettext("Acidosis")}
            </button>

            <button
              type="button"
              class={[
                "btn btn-sm",
                if(@selection == :normal, do: "btn-success btn-active", else: "btn-outline")
              ]}
              phx-click="select_parameter"
              phx-value-parameter={@parameter}
              phx-value-selection="normal"
              disabled={@disabled}
            >
              {gettext("Normal")}
            </button>

            <button
              type="button"
              class={[
                "btn btn-sm",
                if(@selection == :alkalosis, do: "btn-info btn-active", else: "btn-outline")
              ]}
              phx-click="select_parameter"
              phx-value-parameter={@parameter}
              phx-value-selection="alkalosis"
              disabled={@disabled}
            >
              {gettext("Alkalosis")}
            </button>
          </div>
        </div>
      </div>
    </div>
    """
  end

  # Parameter display component (shows value without classification buttons)
  attr :parameter, :atom, required: true
  attr :value, :any, required: true
  attr :show_reference_values, :boolean, default: false
  attr :case_data, :map, required: true

  def parameter_display(assigns) do
    ~H"""
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body">
        <h3 class="card-title text-sm">
          {parameter_name(@parameter)}
          <%= if @show_reference_values do %>
            <span class="text-xs font-normal opacity-60">
              ({get_fimlab_reference_range(@parameter, @case_data)})
            </span>
          <% end %>
        </h3>
        <div class="stat-value text-lg font-mono text-primary">
          {format_value(@value, @parameter)}
        </div>

        <div class="card-actions justify-start mt-4">
          <div class="text-xs">
            {gettext("Reference only")}
          </div>
        </div>
      </div>
    </div>
    """
  end

  # Parameter result component (for showing results after checking answers)
  attr :parameter, :atom, required: true
  attr :value, :any, required: true
  attr :user_selection, :atom, required: true
  attr :correct_selection, :atom, required: true

  def parameter_result(assigns) do
    ~H"""
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body">
        <h3 class="card-title text-sm">{parameter_name(@parameter)}</h3>
        <div class="stat-value text-lg font-mono text-primary">
          {format_value(@value, @parameter)}
        </div>

        <div class="space-y-3 mt-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium">{gettext("Your answer:")}</span>
            <div class={[
              "badge",
              if(@user_selection == @correct_selection, do: "badge-success", else: "badge-error")
            ]}>
              <.icon
                name={
                  if(@user_selection == @correct_selection, do: "hero-check", else: "hero-x-mark")
                }
                class="w-3 h-3 mr-1"
              />
              {classification_label(@user_selection)}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium">{gettext("Correct:")}</span>
            <div class="badge badge-success">
              <.icon name="hero-check" class="w-3 h-3 mr-1" />
              {classification_label(@correct_selection)}
            </div>
          </div>
        </div>
      </div>
    </div>
    """
  end

  # Event handlers
  def handle_event("select_parameter", %{"parameter" => param, "selection" => selection}, socket) do
    parameter = String.to_atom(param)
    selection_atom = String.to_atom(selection)

    new_selections = Map.put(socket.assigns.selections, parameter, selection_atom)

    {:noreply, assign(socket, :selections, new_selections)}
  end

  def handle_event("select_interpretation", %{"interpretation" => interpretation}, socket) do
    interpretation_value = if interpretation == "", do: nil, else: interpretation
    {:noreply, assign(socket, :selected_interpretation, interpretation_value)}
  end

  def handle_event("check_answers", _params, socket) do
    # Calculate score and show results
    socket =
      socket
      |> calculate_score()
      |> assign(:state, :review)

    {:noreply, socket}
  end

  def handle_event("next_case", _params, socket) do
    {:noreply, setup_new_case(socket)}
  end

  def handle_event("toggle_reference_values", %{"show_reference_values" => "on"}, socket) do
    {:noreply, assign(socket, :show_reference_values, true)}
  end

  def handle_event("toggle_reference_values", _params, socket) do
    {:noreply, assign(socket, :show_reference_values, false)}
  end

  # Helper functions
  defp setup_new_case(socket) do
    case_data = generate_case()
    correct_interpretation = get_correct_interpretation(case_data)

    socket
    |> assign(:state, :ready)
    |> assign(:case_data, case_data)
    |> assign(:case_summary, generate_case_summary(case_data))
    |> assign(:selections, %{ph: nil, pco2: nil, bicarbonate: nil})
    |> assign(:selected_interpretation, nil)
    |> assign(:interpretation_options, get_interpretation_options())
    |> assign(:correct_interpretation, correct_interpretation)
    |> assign(:score, 0)
    |> assign_new(:show_reference_values, fn -> false end)
  end

  defp generate_case do
    # Generate realistic clinical cases with matching ABG values
    case_templates = [
      # COPD exacerbation - respiratory acidosis with partial compensation
      %{
        scenario: :copd_exacerbation,
        ph: Decimal.new("7.32"),
        pco2: Decimal.new("7.2"),
        po2: Decimal.new("8.5"),
        bicarbonate: Decimal.new("28"),
        base_excess: Decimal.new("3"),
        age: Enum.random(55..75),
        sex: Enum.random(["male", "female"])
      },
      # Diabetic ketoacidosis - metabolic acidosis with respiratory compensation
      %{
        scenario: :dka,
        ph: Decimal.new("7.22"),
        pco2: Decimal.new("3.8"),
        po2: Decimal.new("12.5"),
        bicarbonate: Decimal.new("15"),
        base_excess: Decimal.new("-12"),
        age: Enum.random(18..45),
        sex: Enum.random(["male", "female"])
      },
      # Pneumonia with sepsis - mixed disorder
      %{
        scenario: :pneumonia_sepsis,
        ph: Decimal.new("7.28"),
        pco2: Decimal.new("4.2"),
        po2: Decimal.new("9.8"),
        bicarbonate: Decimal.new("18"),
        base_excess: Decimal.new("-8"),
        age: Enum.random(60..80),
        sex: Enum.random(["male", "female"])
      },
      # Anxiety/panic attack - respiratory alkalosis
      %{
        scenario: :anxiety,
        ph: Decimal.new("7.52"),
        pco2: Decimal.new("3.2"),
        po2: Decimal.new("13.8"),
        bicarbonate: Decimal.new("22"),
        base_excess: Decimal.new("-1"),
        age: Enum.random(18..35),
        sex: Enum.random(["male", "female"])
      },
      # Vomiting - metabolic alkalosis
      %{
        scenario: :vomiting,
        ph: Decimal.new("7.48"),
        pco2: Decimal.new("5.8"),
        po2: Decimal.new("11.2"),
        bicarbonate: Decimal.new("32"),
        base_excess: Decimal.new("8"),
        age: Enum.random(25..65),
        sex: Enum.random(["male", "female"])
      },
      # Normal values
      %{
        scenario: :normal,
        ph: Decimal.new("7.38"),
        pco2: Decimal.new("5.1"),
        po2: Decimal.new("11.5"),
        bicarbonate: Decimal.new("24"),
        base_excess: Decimal.new("0"),
        age: Enum.random(25..65),
        sex: Enum.random(["male", "female"])
      }
    ]

    Enum.random(case_templates)
  end

  defp generate_case_summary(case_data) do
    case case_data.scenario do
      :copd_exacerbation ->
        "A #{case_data.age}-year-old #{case_data.sex} presents to the emergency department with worsening shortness of breath over the past 3 days. They have a history of COPD and are a current smoker. Physical examination reveals use of accessory muscles, prolonged expiration, and decreased breath sounds bilaterally. The patient appears drowsy and confused."

      :dka ->
        "A #{case_data.age}-year-old #{case_data.sex} with type 1 diabetes is brought in by ambulance after being found unconscious at home. Family reports the patient has been unwell with flu-like symptoms for several days and may have missed insulin doses. The patient is dehydrated with fruity breath odor and Kussmaul respirations."

      :pneumonia_sepsis ->
        "A #{case_data.age}-year-old #{case_data.sex} is admitted from a nursing home with fever, productive cough, and altered mental status for 2 days. Vital signs show temperature 39.2°C, blood pressure 85/50 mmHg, heart rate 125 bpm. Chest X-ray shows right lower lobe consolidation."

      :anxiety ->
        "A #{case_data.age}-year-old #{case_data.sex} presents to the emergency department with sudden onset of chest tightness, palpitations, and feeling short of breath. The patient appears anxious and reports tingling in fingers and around the mouth. No significant medical history. Symptoms started during a stressful work meeting."

      :vomiting ->
        "A #{case_data.age}-year-old #{case_data.sex} presents with 3 days of severe nausea and vomiting, unable to keep fluids down. The patient appears dehydrated with dry mucous membranes and decreased skin turgor. Reports feeling weak and dizzy when standing."

      :normal ->
        "A #{case_data.age}-year-old #{case_data.sex} undergoing elective surgery. Pre-operative assessment shows the patient is healthy with no significant medical history. Vital signs are stable and the patient is breathing room air comfortably."
    end
  end

  defp get_correct_interpretation(case_data) do
    # Use existing Interpreter module to determine correct answer
    checks =
      Astrup.check_values_against_reference_range(
        Astrup.Lab.Fimlab,
        %{
          ph: case_data.ph,
          pco2: case_data.pco2,
          bicarbonate: case_data.bicarbonate
        },
        %{age_range: "31-50", sex: case_data.sex}
      )

    case Interpreter.primary_disorder(checks) do
      {:respiratory_acidosis, :uncompensated} ->
        "Respiratory acidosis (uncompensated)"

      {:respiratory_acidosis, :partially_compensated} ->
        "Respiratory acidosis with partial metabolic compensation"

      {:respiratory_alkalosis, :uncompensated} ->
        "Respiratory alkalosis (uncompensated)"

      {:respiratory_alkalosis, :partially_compensated} ->
        "Respiratory alkalosis with partial metabolic compensation"

      {:metabolic_acidosis, :uncompensated} ->
        "Metabolic acidosis (uncompensated)"

      {:metabolic_acidosis, :partially_compensated} ->
        "Metabolic acidosis with partial respiratory compensation"

      {:metabolic_alkalosis, :uncompensated} ->
        "Metabolic alkalosis (uncompensated)"

      {:metabolic_alkalosis, :partially_compensated} ->
        "Metabolic alkalosis with partial respiratory compensation"

      :normal ->
        "Normal acid-base balance"

      _ ->
        "Mixed acid-base disorder"
    end
  end

  defp get_interpretation_options do
    [
      "Normal acid-base balance",
      "Respiratory acidosis (uncompensated)",
      "Respiratory acidosis with partial metabolic compensation",
      "Respiratory alkalosis (uncompensated)",
      "Respiratory alkalosis with partial metabolic compensation",
      "Metabolic acidosis (uncompensated)",
      "Metabolic acidosis with partial respiratory compensation",
      "Metabolic alkalosis (uncompensated)",
      "Metabolic alkalosis with partial respiratory compensation",
      "Mixed acid-base disorder"
    ]
  end

  defp all_selections_made?(selections, selected_interpretation) do
    required_params = [:ph, :pco2, :bicarbonate]
    all_params_selected = Enum.all?(required_params, &(Map.get(selections, &1) != nil))
    interpretation_selected = selected_interpretation != nil

    all_params_selected and interpretation_selected
  end

  defp calculate_score(socket) do
    case_data = socket.assigns.case_data
    selections = socket.assigns.selections
    selected_interpretation = socket.assigns.selected_interpretation
    correct_interpretation = socket.assigns.correct_interpretation

    # Calculate correct parameter classifications
    correct_classifications = Interpreter.get_correct_parameter_classifications(case_data)

    # Count correct parameter classifications (3 parameters)
    parameter_score =
      Enum.count(selections, fn {param, user_selection} ->
        Map.get(correct_classifications, param) == user_selection
      end)

    # Check interpretation (1 point)
    interpretation_correct = selected_interpretation == correct_interpretation
    interpretation_score = if interpretation_correct, do: 1, else: 0

    total_score = parameter_score + interpretation_score

    socket
    |> assign(:score, total_score)
    |> assign(:correct_parameter_classifications, correct_classifications)
    |> assign(:interpretation_correct, interpretation_correct)
  end

  defp parameter_name(parameter) do
    case parameter do
      :ph -> "pH"
      :pco2 -> "pCO₂"
      :po2 -> "pO₂"
      :bicarbonate -> "HCO₃⁻"
      :base_excess -> "Base Excess"
    end
  end

  defp format_value(value, parameter) do
    formatted =
      Decimal.round(
        value,
        case parameter do
          :ph -> 2
          :pco2 -> 1
          :po2 -> 1
          :bicarbonate -> 0
          :base_excess -> 1
        end
      )

    unit =
      case parameter do
        :ph -> ""
        :pco2 -> " kPa"
        :po2 -> " kPa"
        :bicarbonate -> " mmol/L"
        :base_excess -> " mmol/L"
      end

    "#{formatted}#{unit}"
  end

  defp classification_label(:acidosis), do: gettext("Acidosis")
  defp classification_label(:normal), do: gettext("Normal")
  defp classification_label(:alkalosis), do: gettext("Alkalosis")

  defp score_message(score) do
    case score do
      4 -> gettext("Perfect!")
      3 -> gettext("Great job!")
      2 -> gettext("Good effort!")
      0..1 -> gettext("Keep studying!")
    end
  end

  defp get_fimlab_reference_range(parameter, case_data) do
    # Create context based on case data
    context = %{
      age_range: Interpreter.get_age_range(case_data.age),
      sex: case_data.sex
    }

    # Get the reference range from Fimlab
    Astrup.pretty_print_reference_range(Astrup.Lab.Fimlab, parameter, context)
  end
end
