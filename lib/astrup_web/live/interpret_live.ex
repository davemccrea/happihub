defmodule AstrupWeb.InterpretLive do
  @moduledoc """
  Case-based ABG interpretation quiz where users are presented with clinical scenarios
  and asked to classify parameters and provide interpretations.
  """
  use AstrupWeb, :live_view

  alias Astrup.Interpreter
  alias Astrup.Case

  @type state :: :ready | :answering | :review

  def mount(_, _, socket) do
    socket = assign(socket, :show_reference_values, false)
    {:ok, setup_new_case(socket)}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div class="mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold mb-4">
            {gettext("Interpretation Quiz")}
          </h1>
          <p class="text-base-content/70 mb-6">
            {gettext("Practice interpreting ABG results with clinical cases")}
          </p>
          
          <!-- Navigation back to Learn -->
          <div class="mb-8">
            <.link navigate={~p"/interpretation"} class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
              {gettext("Back to Learning")}
            </.link>
          </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
          <!-- Sidebar Section -->
          <div class="w-full lg:w-72 lg:sticky lg:top-4 lg:self-start space-y-4 order-1 lg:order-1">
            <section class="border border-base-content/20 shadow p-4">
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
                      not all_selections_made?(@selections, @selected_primary_disorder, @selected_compensation)
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
              <section class="border border-base-content/20 shadow p-4">
                <h2 class="text-lg font-semibold mb-3 text-primary">{gettext("Score")}</h2>
                <div class="text-center">
                  <div class="stat-value text-3xl mb-2">
                    <span class={if @score >= 4, do: "text-success", else: "text-warning"}>
                      {@score}/5
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
            <!-- Results Comparison Table (shown after checking answers) -->
            <%= if @state == :review do %>
              <.results_comparison_table
                score={@score}
                selections={@selections}
                correct_parameter_classifications={@correct_parameter_classifications}
                primary_disorder_correct={@primary_disorder_correct}
                compensation_correct={@compensation_correct}
                selected_primary_disorder={@selected_primary_disorder}
                selected_compensation={@selected_compensation}
                correct_primary_disorder={@correct_primary_disorder}
                correct_compensation={@correct_compensation}
              />
            <% end %>
            
            <!-- Case Interpretation -->
            <div class="border border-base-content/20 shadow p-6 space-y-8">
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
                <div class="flex items-center gap-3 mb-4">
                  <div class="badge badge-primary badge-lg font-bold">1</div>
                  <p class="text-base font-medium">
                    {gettext("Classify each parameter as acidosis, normal, or alkalosis:")}
                  </p>
                </div>

                <div class="space-y-4">
                  <!-- Main parameters for classification -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <.parameter_card
                      parameter={:ph}
                      value={@case_data.ph}
                      selection={@selections.ph}
                      disabled={@state == :review}
                      show_reference_values={@show_reference_values}
                      case_data={@case_data}
                      correct_selection={if @state == :review, do: Map.get(@correct_parameter_classifications, :ph), else: nil}
                    />
                    <.parameter_card
                      parameter={:pco2}
                      value={@case_data.pco2}
                      selection={@selections.pco2}
                      disabled={@state == :review}
                      show_reference_values={@show_reference_values}
                      case_data={@case_data}
                      correct_selection={if @state == :review, do: Map.get(@correct_parameter_classifications, :pco2), else: nil}
                    />
                    <.parameter_card
                      parameter={:bicarbonate}
                      value={@case_data.bicarbonate}
                      selection={@selections.bicarbonate}
                      disabled={@state == :review}
                      show_reference_values={@show_reference_values}
                      case_data={@case_data}
                      correct_selection={if @state == :review, do: Map.get(@correct_parameter_classifications, :bicarbonate), else: nil}
                    />
                  </div>
                  
                  <!-- Reference parameters -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <%= if @state != :review do %>
                <div class="space-y-6">
                  <!-- Step 2: Primary Problem -->
                  <div>
                    <div class="flex items-center gap-3 mb-4">
                      <div class="badge badge-primary badge-lg font-bold">2</div>
                      <p class="text-base font-medium">
                        {gettext("Identify the primary acid-base disorder:")}
                      </p>
                    </div>

                    <.form for={%{}} phx-change="select_primary_disorder">
                      <select
                        name="primary_disorder"
                        class="select select-bordered w-full max-w-md"
                      >
                        <option value="" selected={@selected_primary_disorder == nil}>
                          {gettext("Choose primary disorder...")}
                        </option>
                        <option
                          :for={disorder <- @primary_disorder_options}
                          value={disorder}
                          selected={@selected_primary_disorder == disorder}
                        >
                          {disorder}
                        </option>
                      </select>
                    </.form>
                  </div>

                  <!-- Step 3: Compensation -->
                  <div>
                    <div class="flex items-center gap-3 mb-4">
                      <div class="badge badge-primary badge-lg font-bold">3</div>
                      <p class="text-base font-medium">
                        {gettext("Determine the level of compensation:")}
                      </p>
                    </div>

                    <.form for={%{}} phx-change="select_compensation">
                      <select
                        name="compensation"
                        class="select select-bordered w-full max-w-md"
                        disabled={@selected_primary_disorder == nil or @selected_primary_disorder == "Normal acid-base balance"}
                      >
                        <option value="" selected={@selected_compensation == nil}>
                          {gettext("Choose compensation level...")}
                        </option>
                        <option
                          :for={compensation <- @compensation_options}
                          value={compensation}
                          selected={@selected_compensation == compensation}
                        >
                          {compensation}
                        </option>
                      </select>
                    </.form>
                  </div>
                </div>
              <% end %>
              
              <div class="mt-8 pt-4 border-t border-base-content/10">
                <p class="text-xs text-base-content/60 italic">
                  {gettext("Note: Mixed acid-base disorders and fully compensated conditions exist in clinical practice but are not addressed here for educational simplicity.")}
                </p>
              </div>
            </div>
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
  attr :correct_selection, :atom, default: nil

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

        <%= if not @disabled do %>
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
              >
                {gettext("Alkalosis")}
              </button>
            </div>
          </div>
        <% end %>

      </div>
    </div>
    """
  end

  # Results comparison table component
  attr :selections, :map, required: true
  attr :correct_parameter_classifications, :map, required: true
  attr :primary_disorder_correct, :boolean, required: true
  attr :compensation_correct, :boolean, required: true
  attr :selected_primary_disorder, :string, default: nil
  attr :selected_compensation, :string, default: nil
  attr :correct_primary_disorder, :string, required: true
  attr :correct_compensation, :string, default: nil
  attr :score, :integer, required: true

  def results_comparison_table(assigns) do
    ~H"""
    <div class="border border-base-content/20 shadow p-6 mb-6 bg-base-100">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-primary flex items-center gap-2">
          <.icon name="hero-clipboard-document-check" class="w-5 h-5" />
          {gettext("Results")}
        </h2>
        <div class="text-right">
          <div class="stat-value text-xl">
            <span class={if @score >= 4, do: "text-success", else: "text-warning"}>
              {@score}/5
            </span>
          </div>
          <div class="text-sm opacity-70">
            {score_message(@score)}
          </div>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>{gettext("Parameter")}</th>
              <th>{gettext("Your Answer")}</th>
              <th>{gettext("Correct")}</th>
              <th class="text-center">{gettext("Result")}</th>
            </tr>
          </thead>
          <tbody>
            <tr :for={{param, user_selection} <- @selections}>
              <td class="font-medium">{parameter_name(param)}</td>
              <td>
                <span class={[
                  "badge badge-sm",
                  case user_selection do
                    :acidosis -> "badge-error"
                    :normal -> "badge-success"
                    :alkalosis -> "badge-info"
                  end
                ]}>
                  {classification_label(user_selection)}
                </span>
              </td>
              <td>
                <span class={[
                  "badge badge-sm",
                  case Map.get(@correct_parameter_classifications, param) do
                    :acidosis -> "badge-error"
                    :normal -> "badge-success"
                    :alkalosis -> "badge-info"
                  end
                ]}>
                  {classification_label(Map.get(@correct_parameter_classifications, param))}
                </span>
              </td>
              <td class="text-center">
                <%= if Map.get(@correct_parameter_classifications, param) == user_selection do %>
                  <.icon name="hero-check" class="w-5 h-5 text-success" />
                <% else %>
                  <.icon name="hero-x-mark" class="w-5 h-5 text-error" />
                <% end %>
              </td>
            </tr>
            <tr>
              <td class="font-medium">{gettext("Primary Disorder")}</td>
              <td>
                <span class="text-sm">
                  {@selected_primary_disorder || gettext("No selection")}
                </span>
              </td>
              <td>
                <span class="text-sm">
                  {@correct_primary_disorder}
                </span>
              </td>
              <td class="text-center">
                <%= if @primary_disorder_correct do %>
                  <.icon name="hero-check" class="w-5 h-5 text-success" />
                <% else %>
                  <.icon name="hero-x-mark" class="w-5 h-5 text-error" />
                <% end %>
              </td>
            </tr>
            <%= if @correct_compensation do %>
              <tr>
                <td class="font-medium">{gettext("Compensation")}</td>
                <td>
                  <span class="text-sm">
                    {@selected_compensation || gettext("No selection")}
                  </span>
                </td>
                <td>
                  <span class="text-sm">
                    {@correct_compensation}
                  </span>
                </td>
                <td class="text-center">
                  <%= if @compensation_correct do %>
                    <.icon name="hero-check" class="w-5 h-5 text-success" />
                  <% else %>
                    <.icon name="hero-x-mark" class="w-5 h-5 text-error" />
                  <% end %>
                </td>
              </tr>
            <% end %>
          </tbody>
        </table>
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


  # Event handlers
  def handle_event("select_parameter", %{"parameter" => param, "selection" => selection}, socket) do
    parameter = String.to_atom(param)
    selection_atom = String.to_atom(selection)

    new_selections = Map.put(socket.assigns.selections, parameter, selection_atom)

    {:noreply, assign(socket, :selections, new_selections)}
  end

  def handle_event("select_primary_disorder", %{"primary_disorder" => disorder}, socket) do
    disorder_value = if disorder == "", do: nil, else: disorder
    
    # Reset compensation if primary disorder changes
    socket = socket
    |> assign(:selected_primary_disorder, disorder_value)
    |> assign(:selected_compensation, nil)
    
    {:noreply, socket}
  end

  def handle_event("select_compensation", %{"compensation" => compensation}, socket) do
    compensation_value = if compensation == "", do: nil, else: compensation
    {:noreply, assign(socket, :selected_compensation, compensation_value)}
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
    case_data = Case.get_random_case()
    
    if case_data do
      socket
      |> assign(:state, :ready)
      |> assign(:case_data, case_data)
      |> assign(:case_summary, case_data.case_summary)
      |> assign(:selections, %{ph: nil, pco2: nil, bicarbonate: nil})
      |> assign(:selected_primary_disorder, nil)
      |> assign(:selected_compensation, nil)
      |> assign(:primary_disorder_options, get_primary_disorder_options())
      |> assign(:compensation_options, get_compensation_options())
      |> assign(:correct_primary_disorder, case_data.primary_disorder)
      |> assign(:correct_compensation, case_data.compensation)
      |> assign(:score, 0)
      |> assign(:show_reference_values, true)
    else
      # Fallback if no cases in database
      socket
      |> put_flash(:error, "No cases available. Please contact administrator.")
      |> assign(:state, :ready)
    end
  end



  defp get_primary_disorder_options do
    [
      "Normal acid-base balance",
      "Respiratory acidosis",
      "Respiratory alkalosis", 
      "Metabolic acidosis",
      "Metabolic alkalosis"
    ]
  end

  defp get_compensation_options do
    [
      "Uncompensated",
      "Partially compensated"
    ]
  end


  defp all_selections_made?(selections, selected_primary_disorder, selected_compensation) do
    required_params = [:ph, :pco2, :bicarbonate]
    all_params_selected = Enum.all?(required_params, &(Map.get(selections, &1) != nil))
    primary_disorder_selected = selected_primary_disorder != nil
    
    # Compensation is only required if the primary disorder is not normal
    compensation_required = selected_primary_disorder not in ["Normal acid-base balance", nil]
    compensation_selected = selected_compensation != nil or not compensation_required

    all_params_selected and primary_disorder_selected and compensation_selected
  end

  defp calculate_score(socket) do
    case_data = socket.assigns.case_data
    selections = socket.assigns.selections
    selected_primary_disorder = socket.assigns.selected_primary_disorder
    selected_compensation = socket.assigns.selected_compensation
    correct_primary_disorder = socket.assigns.correct_primary_disorder
    correct_compensation = socket.assigns.correct_compensation

    # Calculate correct parameter classifications
    correct_classifications = Interpreter.get_correct_parameter_classifications(case_data)

    # Count correct parameter classifications (3 parameters)
    parameter_score =
      Enum.count(selections, fn {param, user_selection} ->
        Map.get(correct_classifications, param) == user_selection
      end)

    # Check primary disorder (1 point)
    primary_disorder_correct = selected_primary_disorder == correct_primary_disorder
    primary_disorder_score = if primary_disorder_correct, do: 1, else: 0

    # Check compensation (1 point) - only if compensation is expected
    compensation_score = cond do
      correct_compensation == nil -> 1  # No compensation expected, automatic point
      selected_compensation == correct_compensation -> 1
      true -> 0
    end

    total_score = parameter_score + primary_disorder_score + compensation_score

    socket
    |> assign(:score, total_score)
    |> assign(:correct_parameter_classifications, correct_classifications)
    |> assign(:primary_disorder_correct, primary_disorder_correct)
    |> assign(:compensation_correct, selected_compensation == correct_compensation)
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
      5 -> gettext("Perfect!")
      4 -> gettext("Excellent!")
      3 -> gettext("Good job!")
      2 -> gettext("Getting there!")
      score when score in 0..1 -> gettext("Keep studying!")
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
