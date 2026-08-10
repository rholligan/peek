use tauri::Manager;

#[tauri::command]
fn log_to_terminal(level: &str, message: &str) {
    match level {
        "error" => eprintln!("{}", message),
        _ => println!("{}", message),
    }
}

#[tauri::command]
fn set_fade_title(
    _app: tauri::AppHandle,
    title: String,
    all_titles: Option<Vec<String>>,
    baseline_offset: Option<f64>,
    duration_ms: Option<u64>,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use objc2::rc::Retained;
        use objc2::msg_send;
        use objc2_foundation::NSString;
        use objc2_app_kit::NSStatusBar;

        unsafe {
            let status_bar = NSStatusBar::systemStatusBar();
            let key = NSString::from_str("_statusItems");

            // Validate that NSStatusBar responds to valueForKey:
            let responds_to_kvc: bool = msg_send![&status_bar, respondsToSelector: objc2::sel!(valueForKey:)];
            if !responds_to_kvc {
                return Err("NSStatusBar does not respond to valueForKey:".to_string());
            }

            let status_items: Option<Retained<objc2_foundation::NSObject>> = msg_send![&status_bar, valueForKey: &*key];
            let status_items = status_items.ok_or_else(|| "Failed to retrieve _statusItems from NSStatusBar".to_string())?;
            
            let count: usize = msg_send![&status_items, count];
            if count == 0 {
                return Err("No status items registered in NSStatusBar".to_string());
            }

            let status_item_ptr: *mut std::os::raw::c_void = msg_send![&status_items, pointerAtIndex: 0];
            if status_item_ptr.is_null() {
                return Err("Status item pointer at index 0 is null".to_string());
            }

            let status_item = &*(status_item_ptr as *const objc2_foundation::NSObject);
            let button: Option<Retained<objc2_app_kit::NSButton>> = msg_send![status_item, button];
            let button = button.ok_or_else(|| "Failed to retrieve button from status item".to_string())?;

            // Validate that the button responds to layer backing methods
            let responds_to_wants_layer: bool = msg_send![&button, respondsToSelector: objc2::sel!(setWantsLayer:)];
            if !responds_to_wants_layer {
                return Err("NSButton does not respond to setWantsLayer:".to_string());
            }

            let () = msg_send![&button, setWantsLayer: true];

            // 1. Calculate and set the fixed width if width stabilization is enabled
            let mut attributes_dict: Option<Retained<objc2_foundation::NSDictionary<NSString, objc2_foundation::NSObject>>> = None;
            let font: Option<Retained<objc2_foundation::NSObject>> = msg_send![&button, font];
            if let Some(font) = font {
                let font_key = NSString::from_str("NSFont");
                let offset_key = NSString::from_str("NSBaselineOffset");
                
                let number_class = objc2::runtime::AnyClass::get(std::ffi::CStr::from_bytes_with_nul(b"NSNumber\0").unwrap())
                    .ok_or_else(|| "NSNumber class not found".to_string())?;
                let offset_val = baseline_offset.unwrap_or(0.5f64);
                let offset: Retained<objc2_foundation::NSObject> = msg_send![number_class, numberWithDouble: offset_val];

                attributes_dict = Some(objc2_foundation::NSDictionary::from_slices(
                    &[&*font_key, &*offset_key],
                    &[&*font, &*offset],
                ));
            }

            if let Some(titles) = &all_titles {
                if !titles.is_empty() {
                    let mut max_width: f64 = 0.0;
                    for t in titles {
                        let ns_t = NSString::from_str(t);
                        let size: objc2_foundation::NSSize = if let Some(dict) = &attributes_dict {
                            msg_send![&ns_t, sizeWithAttributes: &**dict]
                        } else {
                            msg_send![&ns_t, sizeWithAttributes: None::<&objc2_foundation::NSDictionary<NSString, objc2_foundation::NSObject>>]
                        };
                        if size.width > max_width {
                            max_width = size.width;
                        }
                    }
                    if max_width > 0.0 {
                        // Set a fixed width with a comfortable padding margin (e.g. 10.0 pixels total)
                        let () = msg_send![status_item, setLength: max_width + 10.0];
                    }
                } else {
                    let () = msg_send![status_item, setLength: -1.0f64]; // NSVariableLength
                }
            } else {
                let () = msg_send![status_item, setLength: -1.0f64]; // NSVariableLength
            }

            // 2. Set up the Core Animation transition if a duration is specified
            if let Some(duration) = duration_ms {
                if duration > 0 {
                    let transition_class = objc2::runtime::AnyClass::get(std::ffi::CStr::from_bytes_with_nul(b"CATransition\0").unwrap())
                        .ok_or_else(|| "CATransition class not found".to_string())?;
                    let transition: Retained<objc2_foundation::NSObject> = msg_send![transition_class, animation];

                    let duration_secs = duration as f64 / 1000.0;
                    let () = msg_send![&transition, setDuration: duration_secs];
                    
                    let fade_str = NSString::from_str("fade");
                    let () = msg_send![&transition, setType: &*fade_str];

                    let ease_in_ease_out_str = NSString::from_str("easeInEaseOut");
                    let media_timing_class = objc2::runtime::AnyClass::get(std::ffi::CStr::from_bytes_with_nul(b"CAMediaTimingFunction\0").unwrap())
                        .ok_or_else(|| "CAMediaTimingFunction class not found".to_string())?;
                    let timing_function: Retained<objc2_foundation::NSObject> = msg_send![
                        media_timing_class,
                        functionWithName: &*ease_in_ease_out_str
                    ];
                    let () = msg_send![&transition, setTimingFunction: &*timing_function];

                    let layer: Option<Retained<objc2_foundation::NSObject>> = msg_send![&button, layer];
                    if let Some(layer) = layer {
                        let anim_key = NSString::from_str("fadeText");
                        let () = msg_send![&layer, addAnimation: &*transition, forKey: &*anim_key];
                    }
                }
            }

            // 3. Set the new title with baseline offset alignment correction
            let ns_title = NSString::from_str(&title);
            if let Some(dict) = &attributes_dict {
                let attr_string_class = objc2::runtime::AnyClass::get(std::ffi::CStr::from_bytes_with_nul(b"NSAttributedString\0").unwrap())
                    .ok_or_else(|| "NSAttributedString class not found".to_string())?;
                let alloc_str: *mut objc2_foundation::NSObject = msg_send![attr_string_class, alloc];
                let attributed_title_ptr: *mut objc2_foundation::NSObject = msg_send![
                    alloc_str,
                    initWithString: &*ns_title,
                    attributes: &**dict
                ];
                let attributed_title = Retained::from_raw(attributed_title_ptr)
                    .ok_or_else(|| "Failed to construct NSAttributedString".to_string())?;
                let () = msg_send![&button, setAttributedTitle: &*attributed_title];
            } else {
                let () = msg_send![&button, setTitle: &*ns_title];
            }
        }
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        use tauri::Manager;
        if let Some(tray) = _app.tray_by_id("peek-icon") {
            let _ = tray.set_title(Some(title));
        }
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![log_to_terminal, set_fade_title])
        .setup(|app| {
            // Hide dock icon on macOS — this is a tray-only app
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            let _ = app;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
