defmodule AstrupWeb.HomeLive do
  use AstrupWeb, :live_view

  def mount(_, _, socket) do
    random_minutes =
      -60..-2
      |> Enum.take_random(1)
      |> List.first()

    sample_date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)

    printed_date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)
      |> DateTime.add(2, :minute)

    {:ok,
     socket
     |> assign(:show_hints, true)
     |> assign(:sample_date, sample_date)
     |> assign(:printed_date, printed_date)}
  end

  def render(assigns) do
    ~H"""
    <article class="max-w-2xl border mx-auto bg-white py-12 px-12 shadow-2xl">
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
            <span>19759</span>
          </div>
        </div>
      </header>

      <hr class="border-gray-800 border-[1.5px] mb-1 mt-1" />

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

      <hr class="border-gray-800 mb-1 mt-2 border-[1.5px]" />

      <div class="px-4">
        <section class="mb-1">
          <.heading label="Temperature-corrected values" />
          <dl class="space-y-1 ml-8">
            <.result_row show_hints={@show_hints} id="value-0">
              <:label>pH(<i> T </i>)</:label>
              <:value>7,446</:value>
              <:unit>pH</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-1">
              <:label>
                <i>p</i>CO<sub>2</sub>(<i> T </i>)
              </:label>
              <:value>4,88</:value>
              <:unit>kPa</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-2">
              <:label>
                <i>p</i>O<sub>2</sub>(<i> T </i>)
              </:label>
              <:value>11,5</:value>
              <:unit>kPa</:unit>
            </.result_row>
          </dl>
        </section>

        <section class="mb-1">
          <.heading label="Acid-base status" />
          <dl class="space-y-1 ml-8">
            <.result_row show_hints={@show_hints} id="value-3">
              <:label><i>c</i>HCO<sub>3</sub><sup>-</sup>(P)<i><sub>c</sub></i></:label>
              <:value>25,2</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-4">
              <:label><i>c</i>Base(Ecf)<i><sub>c</sub></i></:label>
              <:value>1,1</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-5">
              <:label>Anion Gap<i><sub>c</sub></i></:label>
              <:value>6,9</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
          </dl>
        </section>

        <section class="mb-1">
          <.heading label="Oximetry values" />
          <dl class="space-y-1 ml-8">
            <.result_row show_hints={@show_hints} id="value-6">
              <:label><i>c</i>tHb</:label>
              <:value>107</:value>
              <:unit>g/L</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-7">
              <:label><i>c</i>tO<sub>2</sub><i>c</i></:label>
              <:value>14,5</:value>
              <:unit>Vol%</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-8">
              <:label><i>s</i>O<sub>2</sub></:label>
              <:value>96,7</:value>
              <:unit>%</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-9">
              <:label><i>F</i>COHb</:label>
              <:value>0,5</:value>
              <:unit>%</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-10">
              <:label><i>F</i>MetHb</:label>
              <:value>0,7</:value>
              <:unit>%</:unit>
            </.result_row>
          </dl>
        </section>

        <section class="mb-1">
          <.heading label="Electrolyte values" />
          <dl class="space-y-1 ml-8">
            <.result_row show_hints={@show_hints} id="value-11">
              <:label><i>c</i>K<sup>+</sup></:label>
              <:value>3,7</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-12">
              <:label><i>c</i>Na<sup>+</sup></:label>
              <:value>143</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-13">
              <:label><i>c</i>Ca<sup>2+</sup></:label>
              <:value>1,19</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-14">
              <:label><i>c</i>Ca<sup>2+</sup>(7.4)<i>c</i></:label>
              <:value>1,19</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-15">
              <:label><i>c</i>Cl<sup>-</sup></:label>
              <:value>111</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
          </dl>
        </section>

        <section class="mb-1">
          <.heading label="Metabolite values" />
          <dl class="space-y-1 ml-8">
            <.result_row show_hints={@show_hints} id="value-16">
              <:label><i>c</i>Glu</:label>
              <:value>8,7</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
            <.result_row show_hints={@show_hints} id="value-17">
              <:label><i>c</i>Lac</:label>
              <:value>0,7</:value>
              <:unit>mmol/L</:unit>
            </.result_row>
          </dl>
        </section>
      </div>

      <hr class="border-dashed border-gray-400 mb-1" />

      <section class="mb-2">
        <.heading label="Notes" />
        <dl>
          <div class="flex flex-row gap-24">
            <dt class="italic">c</dt>
            <dd>Calculated value(s)</dd>
          </div>
        </dl>
      </section>

      <hr class="border-gray-800 mb-14 border-[1.5px]" />

      <hr class="border-gray-800 mb-2 border-[1.5px]" />

      <footer>
        <div class="flex justify-between">
          <div>
            <div>Solution pack lot: DX-20</div>
            <div class="flex flex-row gap-12">
              <span>Printed</span>
              <time datetime={@printed_date}>{Calendar.strftime(@printed_date, "%H:%M")}</time>
              <time datetime={@printed_date}>{Calendar.strftime(@printed_date, "%d.%m.%Y")}</time>
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

  def heading(assigns) do
    ~H"""
    <h2 class="text-xl mb-1">{@label}</h2>
    """
  end

  attr :id, :string, required: true
  attr :show_hints, :boolean, default: true
  slot :label, required: true
  slot :value, required: true
  slot :unit, required: true

  def result_row(assigns) do
    n =
      assigns.id
      |> String.replace("value-", "")
      |> String.to_integer()

    assigns =
      assign(assigns, :n, n)

    ~H"""
    <div id={@id} class="grid grid-cols-[1fr_1fr_1fr] gap-4">
      <sl-tooltip disabled={!@show_hints} placement="left-top" content={Astrup.Result.label(@n)}>
        <dt>
          {render_slot(@label)}
        </dt>
      </sl-tooltip>
      <sl-tooltip
        disabled={!@show_hints}
        placement="right-top"
        content={Astrup.Result.format_reference_range(@n)}
      >
        <dd class="font-bold text-right">
          {render_slot(@value)}
        </dd>
      </sl-tooltip>
      <dd>{render_slot(@unit)}</dd>
    </div>
    """
  end
end
