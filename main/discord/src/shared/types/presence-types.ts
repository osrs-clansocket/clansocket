export interface PresenceTemplate {
    activity_type: number;
    activity_name: string;
    activity_url: string | null;
    activity_state: string | null;
    activity_details: string | null;
    activity_emoji_id: string | null;
    activity_emoji_name: string | null;
    activity_emoji_animated: number;
    activity_large_image: string | null;
    activity_large_text: string | null;
    activity_small_image: string | null;
    activity_small_text: string | null;
    activity_buttons_json: string | null;
    activity_timestamp_start_at: number | null;
    activity_timestamp_end_at: number | null;
    status: string;
    afk: number;
    since_ms: number | null;
}

export interface PresenceButton {
    label: string;
    url: string;
}
