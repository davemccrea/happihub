defmodule AstrupWeb.HomeLive do
  use AstrupWeb, :live_view

  # parameter_id => {selection, correct_answer?}
  @selections %{
    0 => {nil, nil},
    1 => {nil, nil},
    2 => {nil, nil},
    3 => {nil, nil},
    4 => {nil, nil},
    5 => {nil, nil},
    6 => {nil, nil},
    7 => {nil, nil},
    8 => {nil, nil},
    9 => {nil, nil},
    10 => {nil, nil},
    11 => {nil, nil},
    12 => {nil, nil},
    13 => {nil, nil},
    14 => {nil, nil},
    15 => {nil, nil},
    16 => {nil, nil},
    17 => {nil, nil}
  }

  def mount(_, _, socket) do
    {:ok, setup(socket)}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash}>
      <div class="flex flex-row gap-8 justify-between">
        <div class="flex-grow flex justify-center">
          <article class="relative max-w-2xl select-none bg-base-200 py-12 px-12 shadow-xl border border-base-content/10">
            <header class="text-center">
              <h1 class="text-3xl font-serif font-medium mb-6">RADIOMETER ABL90 SERIES</h1>
              <div class="space-y-1">
                <div class="flex justify-between">
                  <span>ABL90 ABL TeVa I393-092R0178N0019</span>
                  <time>{Calendar.strftime(@sample_date, "%H:%M")}</time>
                  <time>{Calendar.strftime(@sample_date, "%d.%m.%Y")}</time>
                </div>
                <div class="flex justify-between">
                  <span>PATIENT REPORT</span>
                  <span>Syringe - S 65uL</span>
                  <span>Sample #</span>
                  <span>{@printout.id}</span>
                </div>
              </div>
            </header>

            <hr class="border-[1.5px] mb-1 mt-1" />

            <section class="px-2">
              <.heading label="Identifications" />
              <dl class="ml-4">
                <div class="grid grid-cols-[1fr_2fr] gap-4">
                  <dt>Patient ID</dt>
                  <dd>XXXXXX-XXXX</dd>
                </div>
                <div class="grid grid-cols-[1fr_2fr] gap-4">
                  <dt>Sample type</dt>
                  <dd>Arterial</dd>
                </div>
                <div class="grid grid-cols-[1fr_2fr] gap-4">
                  <dt class="italic">T</dt>
                  <dd>37,0 °C</dd>
                </div>
              </dl>
            </section>

            <hr class="mb-1 mt-2 border-[1.5px]" />

            <div class="px-4">
              <section class="mb-1">
                <.heading label="Temperature-corrected values" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter_id={0} {assigns}>
                    <:label>pH(<i> T </i>)</:label>
                  </.parameter>
                  <.parameter parameter_id={1} {assigns}>
                    <:label>
                      <i>p</i>CO<sub>2</sub>(<i> T </i>)
                    </:label>
                  </.parameter>
                  <.parameter parameter_id={2} {assigns}>
                    <:label>
                      <i>p</i>O<sub>2</sub>(<i> T </i>)
                    </:label>
                  </.parameter>
                </dl>
              </section>

              <section class="mb-1">
                <.heading label="Acid-base status" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter_id={3} {assigns}>
                    <:label><i>c</i>HCO<sub>3</sub><sup>-</sup>(P)<i><sub>c</sub></i></:label>
                  </.parameter>
                  <.parameter parameter_id={4} {assigns}>
                    <:label><i>c</i>Base(Ecf)<i><sub>c</sub></i></:label>
                  </.parameter>
                  <.parameter parameter_id={5} {assigns}>
                    <:label>Anion Gap<i><sub>c</sub></i></:label>
                  </.parameter>
                </dl>
              </section>

              <section class="mb-1">
                <.heading label="Oximetry values" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter_id={6} {assigns}>
                    <:label><i>c</i>tHb</:label>
                  </.parameter>
                  <.parameter parameter_id={7} {assigns}>
                    <:label><i>c</i>tO<sub>2</sub><i>c</i></:label>
                  </.parameter>
                  <.parameter parameter_id={8} {assigns}>
                    <:label><i>s</i>O<sub>2</sub></:label>
                  </.parameter>
                  <.parameter parameter_id={9} {assigns}>
                    <:label><i>F</i>COHb</:label>
                  </.parameter>
                  <.parameter parameter_id={10} {assigns}>
                    <:label><i>F</i>MetHb</:label>
                  </.parameter>
                </dl>
              </section>

              <section class="mb-1">
                <.heading label="Electrolyte values" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter_id={11} {assigns}>
                    <:label><i>c</i>K<sup>+</sup></:label>
                  </.parameter>
                  <.parameter parameter_id={12} {assigns}>
                    <:label><i>c</i>Na<sup>+</sup></:label>
                  </.parameter>
                  <.parameter parameter_id={13} {assigns}>
                    <:label><i>c</i>Ca<sup>2+</sup></:label>
                  </.parameter>
                  <.parameter parameter_id={14} {assigns}>
                    <:label><i>c</i>Ca<sup>2+</sup>(7.4)<i>c</i></:label>
                  </.parameter>
                  <.parameter parameter_id={15} {assigns}>
                    <:label><i>c</i>Cl<sup>-</sup></:label>
                  </.parameter>
                </dl>
              </section>

              <section class="mb-1">
                <.heading label="Metabolite values" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter_id={16} {assigns}>
                    <:label><i>c</i>Glu</:label>
                  </.parameter>
                  <.parameter parameter_id={17} {assigns}>
                    <:label><i>c</i>Lac</:label>
                  </.parameter>
                </dl>
              </section>
            </div>

            <hr class="border-dashed mb-1" />

            <section class="mb-2">
              <.heading label="Notes" />
              <dl>
                <div class="flex flex-row gap-24">
                  <dt class="italic">c</dt>
                  <dd>Calculated value(s)</dd>
                </div>
              </dl>
            </section>

            <hr class="mb-14 border-[1.5px]" />

            <hr class="mb-2 border-[1.5px]" />

            <footer>
              <div class="flex justify-between">
                <div>
                  <div>Solution pack lot: DX-20</div>
                  <div class="flex flex-row gap-12">
                    <span>Printed</span>
                    <time datetime={@printed_date}>{Calendar.strftime(@printed_date, "%H:%M")}</time>
                    <time datetime={@printed_date}>
                      {Calendar.strftime(@printed_date, "%d.%m.%Y")}
                    </time>
                  </div>
                </div>
                <div class="text-right">
                  <div>Sensor cassette run #: 2496-39</div>
                </div>
              </div>
            </footer>
          </article>
        </div>

        <div class="sticky top-4 self-start space-y-4 w-64">
          <h2 class="text-xl font-semibold mb-3">Reference Values Quiz</h2>
          <p class="text-sm mb-4">
            For each parameter on the left, select whether the value is Low (L), Normal (N), or High (H) compared to its reference range.
            Once you've made all 18 selections, click "Check Answers".
          </p>
          <div class="flex flex-col gap-3">
            <button
              phx-click="check_answers"
              class="btn btn-primary w-full"
              disabled={@test_state == :result}
            >
              Check Answers
            </button>
            <button
              phx-click="reset"
              class="btn btn-secondary w-full"
              disabled={@test_state != :result}
            >
              Next <.icon name="hero-arrow-right" />
            </button>
          </div>
          <div class="mt-4 pt-4 border-t">
            <p>
              Selections: {number_of_selections_made(@selections)}/18
            </p>
            <%= if @test_state == :result do %>
              <.score selections={@selections} />
            <% end %>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end

  def heading(assigns) do
    ~H"""
    <h2 class="text-xl mb-1">{@label}</h2>
    """
  end

  attr :parameter_id, :integer, required: true
  slot :label, required: true

  def parameter(assigns) do
    ~H"""
    <% {selection, correct_answer?} = @selections[@parameter_id] %>

    <div id={"param-#{@parameter_id}"} class="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
      <dt>
        <div class="tooltip tooltip-right" data-tip={Astrup.get_parameter_label(@parameter_id)}>
          {render_slot(@label)}
        </div>
      </dt>

      <dd class="font-bold text-right">{@printout[@parameter_id]}</dd>

      <dd>{Astrup.units_for_parameter(:abl90, @parameter_id)}</dd>

      <dd class="flex flex-row gap-1 items-center">
        <div
          id={"tooltip-param-#{@parameter_id}"}
          class={
            if(show_hint?(@test_state, correct_answer?),
              do: "tooltip tooltip-right tooltip-open",
              else: ""
            )
          }
          data-tip={Astrup.pretty_print_reference_range(@parameter_id)}
        >
          <button
            id={"btn-param-#{@parameter_id}-low"}
            phx-click="select"
            phx-value-choice="low"
            phx-value-parameter_id={@parameter_id}
            class={[
              "btn btn-sm btn-square",
              button_colour(selection == :low, correct_answer?, @test_state)
            ]}
          >
            {gettext("L")}
          </button>

          <button
            id={"btn-param-#{@parameter_id}-normal"}
            phx-click="select"
            phx-value-choice="normal"
            phx-value-parameter_id={@parameter_id}
            class={[
              "btn btn-sm btn-square",
              button_colour(selection == :normal, correct_answer?, @test_state)
            ]}
          >
            {gettext("N")}
          </button>

          <button
            id={"btn-param-#{@parameter_id}-high"}
            phx-click="select"
            phx-value-choice="high"
            phx-value-parameter_id={@parameter_id}
            class={[
              "btn btn-sm btn-square",
              button_colour(selection == :high, correct_answer?, @test_state)
            ]}
          >
            {gettext("H")}
          </button>
        </div>
      </dd>
    </div>
    """
  end

  def handle_event("select", params, socket) do
    parameter_id = String.to_integer(params["parameter_id"])
    choice = String.to_existing_atom(params["choice"])
    selections = Map.put(socket.assigns.selections, parameter_id, {choice, nil})

    {:noreply,
     socket
     |> assign(:selections, selections)
     |> assign(:test_state, :input)}
  end

  def handle_event("check_answers", _params, socket) do
    {:noreply,
     socket
     |> assign(:selections, check_answers(socket.assigns))
     |> assign(:test_state, :result)}
  end

  def handle_event("reset", _params, socket) do
    {:noreply, setup(socket)}
  end

  defp setup(socket) do
    sample_number = Enum.random(10000..99999)
    printout = Astrup.random_printout()
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

    socket
    |> assign(:selections, @selections)
    |> assign(:test_state, :pending)
    |> assign(:printout, printout)
    |> assign(:sample_number, sample_number)
    |> assign(:sample_date, sample_date)
    |> assign(:printed_date, printed_date)
  end

  defp check_answers(%{selections: selections, printout: printout}) do
    Enum.reduce(selections, %{}, fn {parameter_id, {choice, _}}, acc ->
      parameter_value = printout[parameter_id]
      correct_answer = Astrup.check_reference_range(parameter_id, parameter_value)
      Map.put(acc, parameter_id, {choice, choice == correct_answer})
    end)
  end

  attr :selections, :map, required: true

  defp score(assigns) do
    correct_count =
      assigns.selections
      |> Enum.filter(fn {_, {_, correct?}} -> correct? == true end)
      |> length()

    assigns = %{
      correct_count: correct_count,
      total_count: map_size(assigns.selections)
    }

    ~H"""
    <p class="mt-2">
      Score: {@correct_count}/{@total_count}
    </p>
    <%= if @correct_count == @total_count && @total_count > 0 do %>
      <p class="text-lg font-semibold text-success mt-2">
        Congratulations! 🎉
      </p>
    <% end %>
    """
  end

  # selected?, correct_answer?, test_state
  defp button_colour(true, true, :result), do: "border border-success border-2"
  defp button_colour(true, false, :result), do: "border border-error border-2"
  defp button_colour(true, _, :input), do: "border border-base-content border-2"
  defp button_colour(_, _, _), do: "border border-transparent border-2"

  defp number_of_selections_made(selections) do
    selections
    |> Enum.filter(fn {_, {selection, _}} -> not is_nil(selection) end)
    |> length()
  end

  # test_state, correct_answer?
  def show_hint?(:result, correct_answer?), do: not correct_answer?
  def show_hint?(_, _), do: false
end
