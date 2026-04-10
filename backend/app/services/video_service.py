import ffmpeg


def get_video_metadata(filepath: str) -> dict:
    probe = ffmpeg.probe(filepath)
    video_stream = next(
        s for s in probe['streams'] if s['codec_type'] == 'video'
    )
    fps_num, fps_den = video_stream['r_frame_rate'].split('/')
    fps = float(fps_num) / float(fps_den)
    duration = float(probe['format']['duration'])
    nb_frames = video_stream.get('nb_frames')
    total_frames = int(nb_frames) if nb_frames else int(fps * duration)
    return {
        "duration_seconds": duration,
        "fps": fps,
        "total_frames": total_frames,
        "width": video_stream['width'],
        "height": video_stream['height'],
        "codec": video_stream['codec_name'],
    }
