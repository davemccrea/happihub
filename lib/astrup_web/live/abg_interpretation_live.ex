defmodule AstrupWeb.AbgInterpretationLive do
  use AstrupWeb, :live_view

  alias Astrup.Lab.Fimlab
  alias Astrup.Interpreter

  @ph Decimal.new("7.40")
  @pco2 Decimal.new("4.6")
  @bicarbonate Decimal.new("24")

  def mount(_params, _session, socket) do
    ph_check = Astrup.check_value_against_reference_range(Fimlab, :ph, @ph)
    co2_check = Astrup.check_value_against_reference_range(Fimlab, :pco2, @pco2)

    bicarbonate_check =
      Astrup.check_value_against_reference_range(Fimlab, :bicarbonate, @bicarbonate)

    primary_disorder = primary_disorder(@ph, @pco2, @bicarbonate)

    {:ok,
     socket
     |> assign(:ph, @ph)
     |> assign(:pco2, @pco2)
     |> assign(:bicarbonate, @bicarbonate)
     |> assign(:ph_check, ph_check)
     |> assign(:co2_check, co2_check)
     |> assign(:bicarbonate_check, bicarbonate_check)
     |> assign(:primary_disorder, primary_disorder)
     |> load_copenhagen_interpretation()}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <.form for={%{}} phx-change="change" class="flex flex-col max-w-2xl m-auto gap-12">
        {@primary_disorder |> format_primary_disorder()}

        {if @copenhagen_interpretation,
          do: @copenhagen_interpretation |> Decimal.new() |> Decimal.round(2)}

        <.range
          name={:ph}
          min="7.05"
          max="7.75"
          step="0.01"
          value={Decimal.round(@ph, 2)}
          round={2}
          label="pH"
          label_step="0.05"
          check={@ph_check}
        />
        <.range
          name={:pco2}
          min="2.5"
          max="9.5"
          step="0.1"
          value={Decimal.round(@pco2, 1)}
          round={1}
          label="pCO2"
          label_step="0.5"
          check={@co2_check}
        />
        <.range
          name={:bicarbonate}
          min="16"
          max="35"
          step="1"
          value={Decimal.round(@bicarbonate, 0)}
          round={0}
          label="bicarbonate"
          label_step="1"
          check={@bicarbonate_check}
        />
      </.form>
    </Layouts.app>
    """
  end

  def handle_event("change", %{"ph" => ph, "pco2" => pco2, "bicarbonate" => bicarbonate}, socket) do
    ph_check = Astrup.check_value_against_reference_range(Fimlab, :ph, ph)
    co2_check = Astrup.check_value_against_reference_range(Fimlab, :pco2, pco2)

    bicarbonate_check =
      Astrup.check_value_against_reference_range(Fimlab, :bicarbonate, bicarbonate)

    primary_disorder = primary_disorder(ph, pco2, bicarbonate)

    {:noreply,
     socket
     |> assign(:ph, ph)
     |> assign(:pco2, pco2)
     |> assign(:bicarbonate, bicarbonate)
     |> assign(:ph_check, ph_check)
     |> assign(:co2_check, co2_check)
     |> assign(:bicarbonate_check, bicarbonate_check)
     |> assign(:primary_disorder, primary_disorder)
     |> load_copenhagen_interpretation()}
  end

  attr :name, :atom, required: true
  attr :min, :string, required: true
  attr :max, :string, required: true
  attr :step, :string, required: true
  attr :label_step, :string, required: true
  attr :value, :string, required: true
  attr :round, :integer, required: true
  attr :label, :string, required: true
  attr :check, :string, required: true

  defp range(assigns) do
    min = Decimal.new(assigns.min)
    max = Decimal.new(assigns.max)
    label_step_decimal = Decimal.new(assigns.label_step)

    labels =
      Stream.iterate(min, &Decimal.add(&1, label_step_decimal))
      |> Stream.take_while(&(Decimal.compare(&1, max) != :gt))
      |> Enum.to_list()
      |> Enum.map(&Decimal.round(&1, assigns.round))

    assigns = assign(assigns, :labels, labels)

    ~H"""
    <div class="flex flex-col">
      <span class="text-xl">
        {@label} — {@value} — {@check}
      </span>
      <div class="w-full">
        <input
          phx-debounce="100"
          name={@name}
          type="range"
          min={@min}
          max={@max}
          value={@value}
          class="range w-full"
          step={@step}
        />
        <div class="flex justify-between px-2.5 mt-2 text-xs">
          <span :for={_label <- @labels}>|</span>
        </div>
        <div class="flex justify-between px-2.5 mt-2 text-xs">
          <span :for={label <- @labels} class={label_color(label, @name)}>
            {label}
          </span>
        </div>
      </div>
    </div>
    """
  end

  defp label_color(label_string, name) do
    label_decimal = Decimal.new(label_string)

    if Astrup.check_value_against_reference_range(Fimlab, name, label_decimal) ==
         :normal do
      "text-success"
    else
      ""
    end
  end

  defp primary_disorder(ph, pco2, bicarbonate) do
    Fimlab
    |> Astrup.check_values_against_reference_range(%{
      ph: ph,
      pco2: pco2,
      bicarbonate: bicarbonate
    })
    |> Astrup.Interpreter.primary_disorder()
  end

  defp format_primary_disorder(primary_disorder) do
    case primary_disorder do
      :normal -> "Normal"
      {type, compensation} -> "#{type}, #{compensation}"
      _ -> "Not determined"
    end
  end

  defp load_copenhagen_interpretation(socket) do
    socket
    |> assign(
      copenhagen_interpretation:
        Interpreter.copenhagen_interpretation(
          socket.assigns.pco2,
          socket.assigns.primary_disorder,
          :chronic
        )
    )
  end
end
