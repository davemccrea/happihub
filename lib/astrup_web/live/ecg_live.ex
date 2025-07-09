defmodule AstrupWeb.ECGLive do
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       is_playing: false,
       current_lead: 0,
       elapsed_time: 0,
       display_mode: "single",
       grid_type: "simple",
       lead_names: ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"],
       env: Application.get_env(:astrup, :env),
       ecg_loaded: false
     )}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="space-y-12">
        <h1 class="text-2xl font-bold">ECG Test</h1>

        <%= if @ecg_loaded do %>
          <div class="flex gap-4">
            <form phx-change="change_lead">
              <.input
                type="select"
                name="lead"
                value={@current_lead}
                label="Current Lead"
                options={
                  Enum.with_index(@lead_names)
                  |> Enum.map(fn {name, index} -> {"Lead #{name}", index} end)
                }
              />
            </form>

            <form phx-change="change_display_mode">
              <.input
                type="select"
                name="display_mode"
                value={@display_mode}
                label="Display Mode"
                options={[
                  {"Single Lead", "single"},
                  {"All Leads", "multi"}
                ]}
              />
            </form>

            <form phx-change="change_grid_type">
              <.input
                type="select"
                name="grid_type"
                value={@grid_type}
                label="Grid Type"
                options={[
                  {"Medical Grid", "medical"},
                  {"Simple Grid", "simple"}
                ]}
              />
            </form>
          </div>
        <% end %>

        <div class="space-y-4">
          <div class="relative">
            <div
              id="ecg-playback"
              phx-hook="ECGPlayback"
              phx-update="ignore"
              class="w-full"
              data-grid-type={@grid_type}
              data-display-mode={@display_mode}
              data-current-lead={@current_lead}
              data-is-playing={to_string(@is_playing)}
              data-env={@env}
            >
              <div data-ecg-chart class="w-full"></div>
            </div>
            
            <%= if not @ecg_loaded do %>
              <div class="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-90">
                <div class="text-center space-y-4">
                  <div class="text-6xl opacity-30">
                    <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                  </div>
                  <div class="space-y-2">
                    <p class="text-lg font-medium">No ECG Data Loaded</p>
                    <p class="text-sm text-gray-500">Click "Load Random ECG" to begin</p>
                  </div>
                </div>
              </div>
            <% end %>
          </div>

          <%= if @ecg_loaded do %>
            <div class="text-sm text-gray-500 flex items-center gap-2">
              <span>Click on the ECG chart and use</span>
              <kbd class="kbd kbd-sm">k</kbd>
              <kbd class="kbd kbd-sm">j</kbd>
              <span>to switch leads,</span>
              <kbd class="kbd kbd-sm">Space</kbd>
              <span>to play/pause</span>
            </div>
          <% end %>
        </div>

        <div class="flex gap-4 items-center">
          <%= if @ecg_loaded do %>
            <.button phx-click="toggle_playback" variant="primary">
              {if @is_playing, do: "Pause", else: "Play"}
            </.button>
          <% end %>
          
          <.button phx-click="load_random_ecg">
            {if @ecg_loaded, do: "Load Different ECG", else: "Load Random ECG"}
          </.button>
        </div>
      </div>
    </Layouts.app>
    """
  end

  def handle_event("toggle_playback", _params, socket) do
    new_playing = !socket.assigns.is_playing

    socket =
      socket
      |> assign(is_playing: new_playing)
      |> push_event("playback_changed", %{is_playing: new_playing})

    {:noreply, socket}
  end

  def handle_event("change_lead", %{"lead" => lead_index_str}, socket) do
    case Integer.parse(lead_index_str) do
      {lead_index, ""} when lead_index >= 0 and lead_index < length(socket.assigns.lead_names) ->
        socket =
          socket
          |> assign(current_lead: lead_index)
          |> push_event("lead_changed", %{lead: lead_index})

        {:noreply, socket}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("lead_changed", %{"lead" => lead_index}, socket) when is_integer(lead_index) do
    if lead_index >= 0 and lead_index < length(socket.assigns.lead_names) do
      {:noreply, assign(socket, current_lead: lead_index)}
    else
      {:noreply, socket}
    end
  end

  def handle_event("playback_changed", %{"is_playing" => is_playing}, socket)
      when is_boolean(is_playing) do
    {:noreply, assign(socket, is_playing: is_playing)}
  end

  def handle_event("time_update", %{"elapsed_time" => elapsed_time}, socket) do
    {:noreply, assign(socket, elapsed_time: elapsed_time)}
  end

  def handle_event("playback_ended", _params, socket) do
    {:noreply, assign(socket, is_playing: false)}
  end

  def handle_event("change_display_mode", %{"display_mode" => display_mode}, socket) do
    if display_mode in ["single", "multi"] do
      socket =
        socket
        |> assign(display_mode: display_mode)
        |> push_event("display_mode_changed", %{display_mode: display_mode})

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  def handle_event("change_grid_type", %{"grid_type" => grid_type}, socket) do
    if grid_type in ["medical", "simple"] do
      socket =
        socket
        |> assign(grid_type: grid_type)
        |> push_event("grid_changed", %{grid_type: grid_type})

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  def handle_event("load_random_ecg", _params, socket) do
    case load_random_ecg_data() do
      {:ok, ecg_data} ->
        socket = 
          socket
          |> assign(ecg_loaded: true, is_playing: false)
          |> push_event("ecg_data_pushed", %{data: ecg_data})
        {:noreply, socket}
      
      {:error, reason} ->
        socket = put_flash(socket, :error, "Failed to load ECG: #{reason}")
        {:noreply, socket}
    end
  end

  # Private functions
  
  defp load_random_ecg_data() do
    {:ok, file_path} = get_random_ecg_file()
    load_ecg_json(file_path)
  end
  
  defp get_random_ecg_file() do
    ecg_files = [
      "00068_hr.json", "00295_hr.json", "00391_hr.json", "00612_hr.json", "00745_hr.json",
      "00746_hr.json", "01001_hr.json", "01183_hr.json", "01373_hr.json", "01380_hr.json",
      "01531_hr.json", "01732_hr.json", "01956_hr.json", "02109_hr.json", "02221_hr.json",
      "02243_hr.json", "02524_hr.json", "02591_hr.json", "02808_hr.json", "02838_hr.json",
      "02855_hr.json", "02978_hr.json", "03024_hr.json", "03140_hr.json", "03423_hr.json",
      "03694_hr.json", "04002_hr.json", "04289_hr.json", "04372_hr.json", "04400_hr.json",
      "04651_hr.json", "04816_hr.json", "04831_hr.json", "04924_hr.json", "05071_hr.json",
      "05079_hr.json", "05607_hr.json", "05608_hr.json", "05617_hr.json", "05867_hr.json",
      "06058_hr.json", "06363_hr.json", "06470_hr.json", "06489_hr.json", "06546_hr.json",
      "06643_hr.json", "06775_hr.json", "06838_hr.json", "06888_hr.json", "07176_hr.json",
      "07406_hr.json", "07792_hr.json", "07830_hr.json", "08032_hr.json", "08457_hr.json",
      "08595_hr.json", "08777_hr.json", "08900_hr.json", "09072_hr.json", "09237_hr.json",
      "09413_hr.json", "09436_hr.json", "09462_hr.json", "09793_hr.json", "09833_hr.json",
      "09967_hr.json", "10151_hr.json", "10246_hr.json", "10384_hr.json", "10399_hr.json",
      "10582_hr.json", "11075_hr.json", "11248_hr.json", "11267_hr.json", "11351_hr.json",
      "11413_hr.json", "11439_hr.json", "11754_hr.json", "11825_hr.json", "11980_hr.json",
      "12020_hr.json", "12021_hr.json", "12554_hr.json", "12611_hr.json", "12745_hr.json",
      "12800_hr.json", "12856_hr.json", "12927_hr.json", "12946_hr.json", "13018_hr.json",
      "13302_hr.json", "13420_hr.json", "13455_hr.json", "13459_hr.json", "13495_hr.json",
      "13506_hr.json", "13658_hr.json", "14091_hr.json", "14101_hr.json", "14138_hr.json",
      "14208_hr.json", "14256_hr.json", "14351_hr.json", "14378_hr.json", "14396_hr.json",
      "14571_hr.json", "14989_hr.json", "15175_hr.json", "15906_hr.json", "15937_hr.json",
      "15996_hr.json", "16060_hr.json", "16162_hr.json", "16181_hr.json", "16490_hr.json",
      "16655_hr.json", "16742_hr.json", "16752_hr.json", "16801_hr.json", "16820_hr.json",
      "17211_hr.json", "17233_hr.json", "17241_hr.json", "17471_hr.json", "17578_hr.json",
      "17768_hr.json", "17842_hr.json", "18036_hr.json", "18114_hr.json", "18375_hr.json",
      "18409_hr.json", "18753_hr.json", "19119_hr.json", "19353_hr.json", "19474_hr.json",
      "19503_hr.json", "19548_hr.json", "19731_hr.json", "19813_hr.json", "19980_hr.json",
      "20000_hr.json", "20421_hr.json", "20893_hr.json", "20909_hr.json", "21102_hr.json",
      "21112_hr.json", "21125_hr.json", "21280_hr.json", "21394_hr.json", "21703_hr.json",
      "21800_hr.json"
    ]
    
    random_file = Enum.random(ecg_files)
    file_path = Path.join([Application.app_dir(:astrup), "priv", "static", "assets", "json", "ptb-xl", random_file])
    
    {:ok, file_path}
  end
  
  defp load_ecg_json(file_path) do
    case File.read(file_path) do
      {:ok, json_content} ->
        case Jason.decode(json_content) do
          {:ok, data} ->
            {:ok, data}
          
          {:error, reason} ->
            {:error, "Failed to parse JSON: #{inspect(reason)}"}
        end
      
      {:error, reason} ->
        {:error, "Failed to read file: #{inspect(reason)}"}
    end
  end
end
