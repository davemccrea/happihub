defmodule AstrupWeb.Components.RadiometerABL90FlexPlus do
  use Phoenix.Component
  use Gettext, backend: AstrupWeb.Gettext

  alias Astrup.Parameter

  attr :printout, :map, required: true
  attr :selections, :map, required: true
  attr :state, :atom, values: [:ready, :answering, :review], required: true
  attr :hints_enabled, :boolean, required: true
  attr :get_reference_range, :fun, required: true
  attr :get_unit, :fun, required: true
  attr :sample_date, :any, required: true
  attr :printed_date, :any, required: true
  attr :quiz?, :boolean, required: true
  attr :explorer?, :boolean, default: false

  def render(assigns) do
    ~H"""
    <article class="relative max-w-4xl flex-1 select-none py-12 px-12 shadow border border-base-content/20">
      <header class="text-center">
        <h2 class="text-3xl font-serif font-medium mb-6">RADIOMETER ABL90 SERIES</h2>
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
            <.parameter parameter={:ph} {assigns}>
              <:label>pH(<i> T </i>)</:label>
            </.parameter>
            <.parameter parameter={:pco2} {assigns}>
              <:label>
                <i>p</i>CO<sub>2</sub>(<i> T </i>)
              </:label>
            </.parameter>
            <.parameter parameter={:po2} {assigns}>
              <:label>
                <i>p</i>O<sub>2</sub>(<i> T </i>)
              </:label>
            </.parameter>
          </dl>
        </section>

        <section class="mb-1">
          <.heading label="Acid-base status" />
          <dl class="space-y-1 ml-8">
            <.parameter parameter={:bicarbonate} {assigns}>
              <:label><i>c</i>HCO<sub>3</sub><sup>-</sup>(P)<i><sub>c</sub></i></:label>
            </.parameter>
            <.parameter parameter={:base_excess} {assigns}>
              <:label><i>c</i>Base(Ecf)<i><sub>c</sub></i></:label>
            </.parameter>
            <.parameter parameter={:anion_gap} {assigns}>
              <:label>Anion Gap<i><sub>c</sub></i></:label>
            </.parameter>
          </dl>
        </section>

        <section class="mb-1">
          <.heading label="Oximetry values" />
          <dl class="space-y-1 ml-8">
            <.parameter parameter={:hemoglobin} {assigns}>
              <:label><i>c</i>tHb</:label>
            </.parameter>
            <.parameter parameter={:oxygen_content} {assigns}>
              <:label><i>c</i>tO<sub>2</sub><i>c</i></:label>
            </.parameter>
            <.parameter parameter={:oxygen_saturation} {assigns}>
              <:label><i>s</i>O<sub>2</sub></:label>
            </.parameter>
            <.parameter parameter={:carboxyhemoglobin} {assigns}>
              <:label><i>F</i>COHb</:label>
            </.parameter>
            <.parameter parameter={:methemoglobin} {assigns}>
              <:label><i>F</i>MetHb</:label>
            </.parameter>
          </dl>
        </section>

        <section class="mb-1">
          <.heading label="Electrolyte values" />
          <dl class="space-y-1 ml-8">
            <.parameter parameter={:potassium} {assigns}>
              <:label><i>c</i>K<sup>+</sup></:label>
            </.parameter>
            <.parameter parameter={:sodium} {assigns}>
              <:label><i>c</i>Na<sup>+</sup></:label>
            </.parameter>
            <.parameter parameter={:ionized_calcium} {assigns}>
              <:label><i>c</i>Ca<sup>2+</sup></:label>
            </.parameter>
            <.parameter parameter={:ionized_calcium_corrected_to_ph_7_4} {assigns}>
              <:label><i>c</i>Ca<sup>2+</sup>(7.4)<i>c</i></:label>
            </.parameter>
            <.parameter parameter={:chloride} {assigns}>
              <:label><i>c</i>Cl<sup>-</sup></:label>
            </.parameter>
          </dl>
        </section>

        <section class="mb-1">
          <.heading label="Metabolite values" />
          <dl class="space-y-1 ml-8">
            <.parameter parameter={:glucose} {assigns}>
              <:label><i>c</i>Glu</:label>
            </.parameter>
            <.parameter parameter={:lactate} {assigns}>
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
    """
  end

  defp heading(assigns) do
    ~H"""
    <h3 class="text-xl mb-1">{@label}</h3>
    """
  end

  attr :parameter, :atom, required: true
  slot :label, required: true

  defp parameter(assigns) do
    ~H"""
    <% {selection, correct_answer?} = Map.get(@selections, @parameter, {nil, nil}) %>

    <div id={"param-#{@parameter}"} class={if @explorer?, do: "grid grid-cols-[1fr_1fr_1fr] gap-4", else: "grid grid-cols-[1fr_1fr_1fr_1fr] gap-4"}>
      <%= if @explorer? do %>
        <dt class="cursor-pointer text-primary hover:text-primary-focus transition-colors" phx-click="select_parameter" phx-value-parameter={@parameter}>
          {render_slot(@label)}
        </dt>
      <% else %>
        <%= if @hints_enabled do %>
          <dt class="cursor-pointer">
            <div class="tooltip tooltip-right" data-tip={Parameter.get_label(@parameter)}>
              {render_slot(@label)}
            </div>
          </dt>
        <% else %>
          <dt>{render_slot(@label)}</dt>
        <% end %>
      <% end %>

      <%= if @explorer? do %>
        <dd class="font-bold text-right">
          {Map.get(@printout, @parameter)}
        </dd>
        <dd>{@get_unit.(@parameter)}</dd>
      <% else %>
        <%= if @hints_enabled do %>
          <dd class="cursor-pointer font-bold text-right">
            <div class="tooltip tooltip-left" data-tip={@get_reference_range.(@parameter)}>
              {Map.get(@printout, @parameter)}
            </div>
          </dd>
        <% else %>
          <dd class="font-bold text-right">
            {Map.get(@printout, @parameter)}
          </dd>
        <% end %>

        <dd>{@get_unit.(@parameter)}</dd>

        <%= if @quiz? do %>
        <dd class="flex flex-row flex-nowrap gap-1 items-center">
          <div
            id={"tooltip-param-#{@parameter}"}
            class={
              if(@state == :review && not correct_answer?,
                do: "tooltip tooltip-right tooltip-open",
                else: ""
              )
            }
            data-tip={@get_reference_range.(@parameter)}
          >
            <button
              id={"btn-param-#{@parameter}-low"}
              phx-click="select"
              phx-value-choice="low"
              phx-value-parameter={@parameter}
              class={[
                "btn btn-sm btn-square",
                button_colour(selection == :low, correct_answer?, @state)
              ]}
            >
              {gettext("L")}
            </button>

            <button
              id={"btn-param-#{@parameter}-normal"}
              phx-click="select"
              phx-value-choice="normal"
              phx-value-parameter={@parameter}
              class={[
                "btn btn-sm btn-square",
                button_colour(selection == :normal, correct_answer?, @state)
              ]}
            >
              {gettext("N")}
            </button>

            <button
              id={"btn-param-#{@parameter}-high"}
              phx-click="select"
              phx-value-choice="high"
              phx-value-parameter={@parameter}
              class={[
                "btn btn-sm btn-square",
                button_colour(selection == :high, correct_answer?, @state)
              ]}
            >
              {gettext("H")}
            </button>
          </div>
        </dd>
        <% end %>
      <% end %>
    </div>
    """
  end

  # selected?, correct_answer?, state
  defp button_colour(true, true, :review), do: "border border-success border-2"
  defp button_colour(true, false, :review), do: "border border-error border-2"
  defp button_colour(true, _, :answering), do: "border border-base-content border-2"
  defp button_colour(_, _, _), do: "border border-transparent border-2"
end
