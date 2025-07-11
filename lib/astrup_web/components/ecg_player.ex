defmodule AstrupWeb.Components.EcgPlayer do
  use AstrupWeb, :live_component

  def render(assigns) do
    ~H"""
    <div class="space-y-4">
      <div class="relative">
        <div
          id="ecg-playback"
          phx-hook="ECGPlayback"
          phx-update="ignore"
          phx-target={@myself}
          class="w-full"
          data-env={@env}
          data-initial-lead="1"
          data-initial-display-mode="single"
          data-initial-grid-type="simple"
        >
          <div data-ecg-chart class="w-full"></div>
        </div>

        <%= if not @ecg_loaded do %>
          <div class="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-90">
            <div class="text-center space-y-4">
              <div class="text-6xl opacity-30">
                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  >
                  </path>
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
          <span>Use</span>
          <kbd class="kbd kbd-sm">↑</kbd>
          <kbd class="kbd kbd-sm">↓</kbd>
          <span>or</span>
          <kbd class="kbd kbd-sm">k</kbd>
          <kbd class="kbd kbd-sm">j</kbd>
          <span>to switch leads,</span>
          <kbd class="kbd kbd-sm">Space</kbd>
          <span>to play/pause</span>
        </div>
      <% end %>

      <%= if @ecg_loaded do %>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Clinical Information Section - Left Column -->
          <%= if @ptbxl_record do %>
            <div>
              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-document-text" class="w-5 h-5" /> Clinical Information
                  </h2>
                  
    <!-- Report Section -->
                  <%= if @ptbxl_record.report && @ptbxl_record.report != "" do %>
                    <div class="mb-6">
                      <h3 class="text-lg font-semibold mb-2 flex items-center gap-1">
                        <.icon name="hero-clipboard-document-list" class="w-4 h-4" /> Medical Report
                      </h3>
                      <div class="alert alert-info">
                        <div class="text-sm italic">
                          "{@ptbxl_record.report}"
                        </div>
                      </div>
                    </div>
                  <% end %>
                  
    <!-- SCP Codes Section -->
                  <%= if length(@scp_codes_with_descriptions) > 0 do %>
                    <div>
                      <h3 class="text-lg font-semibold mb-3 flex items-center gap-1">
                        <.icon name="hero-check-circle" class="w-4 h-4" />
                        SCP Codes ({length(@scp_codes_with_descriptions)})
                      </h3>
                      <div class="space-y-3 max-h-80 overflow-y-auto">
                        <%= for scp <- @scp_codes_with_descriptions do %>
                          <div class="card bg-base-100 shadow-sm">
                            <div class="card-body p-4">
                              <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center gap-2">
                                  <div class="badge badge-primary font-mono font-bold">
                                    {scp.code}
                                  </div>
                                  <div class={"badge " <>
                                    case scp.kind do
                                      :diagnostic -> "badge-error"
                                      :form -> "badge-info"
                                      :rhythm -> "badge-success"
                                      _ -> "badge-neutral"
                                    end
                                  }>
                                    {String.upcase(to_string(scp.kind))}
                                  </div>
                                </div>
                                <div class="text-right">
                                  <div class="text-lg font-bold">
                                    {trunc(scp.confidence)}%
                                  </div>
                                  <div class="text-xs opacity-60">confidence</div>
                                </div>
                              </div>
                              <p class="text-sm leading-relaxed mb-2">
                                {scp.description}
                              </p>
                              <%= if scp.diagnostic_class do %>
                                <div class="flex items-center gap-1">
                                  <span class="text-xs opacity-60">Classification:</span>
                                  <div class="badge badge-outline badge-sm">
                                    {scp.diagnostic_class}
                                  </div>
                                </div>
                              <% end %>
                            </div>
                          </div>
                        <% end %>
                      </div>
                    </div>
                  <% end %>
                </div>
              </div>
            </div>
          <% end %>
          
    <!-- Controls and Options - Right Column -->
          <div class={if @ptbxl_record, do: "", else: "lg:col-span-2"}>
            <div class="space-y-6">
              <!-- ECG Controls Section -->
              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-adjustments-horizontal" class="w-5 h-5" /> ECG Controls
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <.input
                        type="select"
                        id="display-mode-selector"
                        label="Display Mode"
                        name="display-mode"
                        value="single"
                        options={[{"Single Lead", "single"}, {"All Leads", "multi"}]}
                      />
                    </div>

                    <div id="lead-selector-container">
                      <.input
                        type="select"
                        id="lead-selector"
                        label="Current Lead"
                        name="lead"
                        value={1}
                        options={
                          for {name, index} <- Enum.with_index(@lead_names) do
                            {"Lead #{name}", index}
                          end
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              
    <!-- View Options Section -->
              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">
                    <.icon name="hero-cog-6-tooth" class="w-5 h-5" /> View Options
                  </h2>
                  <div class="space-y-3">
                    <div>
                      <.input
                        type="select"
                        id="grid-type-selector"
                        label="Grid Type"
                        name="grid-type"
                        value="simple"
                        options={[{"Medical Grid", "medical"}, {"Simple Grid", "simple"}]}
                      />
                    </div>

                    <div class="flex flex-col">
                      <span class="label text-sm mb-1">Grid Scale (mm/s)</span>
                      <input
                        type="range"
                        id="grid-scale-slider"
                        name="grid-scale"
                        min="0.75"
                        max="1.25"
                        step="0.01"
                        value="1.0"
                        class="range range-xs w-1/2"
                      />
                    </div>

                    <div class="flex flex-col">
                      <span class="label text-sm mb-1">Amplitude Scale (mm/mV)</span>
                      <input
                        type="range"
                        id="amplitude-scale-slider"
                        name="amplitude-scale"
                        min="0.75"
                        max="1.25"
                        step="0.01"
                        value="1.0"
                        class="range range-xs w-1/2"
                      />
                    </div>

                    <div class="flex flex-col">
                      <span class="label text-sm mb-1">Height Scale (px)</span>
                      <input
                        type="range"
                        id="height-scale-slider"
                        name="height-scale"
                        min="0.95"
                        max="1.45"
                        step="0.01"
                        value="1.2"
                        class="range range-xs w-1/2"
                      />
                    </div>

                    <div class="flex flex-col gap-1">
                      <div>
                        <.input
                          type="checkbox"
                          id="loop-checkbox"
                          label="Loop playback"
                          name="loop"
                          value="true"
                          checked={true}
                        />
                      </div>

                      <div>
                        <.input
                          type="checkbox"
                          id="qrs-indicator-checkbox"
                          label="QRS pulse indicator"
                          name="qrs-indicator"
                          value="true"
                          checked={true}
                        />
                      </div>

                      <div>
                        <.input
                          type="checkbox"
                          id="debug-checkbox"
                          label="Show diagnostics"
                          name="debug"
                          value="false"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      <% end %>
    </div>
    """
  end

  def handle_event("playback_changed", _params, socket), do: {:noreply, socket}
  def handle_event("lead_changed", _params, socket), do: {:noreply, socket}
  def handle_event("playback_ended", _params, socket), do: {:noreply, socket}
end
