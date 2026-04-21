import threading
import time
import uuid as _uuid
from dataclasses import dataclass, field
from typing import Callable, Optional


@dataclass
class ExportJob:
    id: str
    label: str
    status: str        # "pending" | "running" | "done" | "error" | "cancelled"
    progress: int      # 0-100
    created_at: float
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    result_path: Optional[str] = None
    error: Optional[str] = None
    cancel_event: threading.Event = field(default_factory=threading.Event, repr=False, compare=False)

    def estimated_remaining_s(self) -> Optional[float]:
        if self.status != "running" or self.progress <= 0 or self.started_at is None:
            return None
        elapsed = time.time() - self.started_at
        total_est = elapsed / (self.progress / 100.0)
        return max(0.0, total_est - elapsed)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "status": self.status,
            "progress": self.progress,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "error": self.error,
            "estimated_remaining_s": self.estimated_remaining_s(),
        }


class JobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, ExportJob] = {}
        self._lock = threading.Lock()

    def create_job(self, label: str) -> ExportJob:
        job = ExportJob(
            id=str(_uuid.uuid4()),
            label=label,
            status="pending",
            progress=0,
            created_at=time.time(),
        )
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get_job(self, job_id: str) -> Optional[ExportJob]:
        return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                for k, v in kwargs.items():
                    setattr(job, k, v)

    def cancel(self, job_id: str) -> bool:
        """Demande l'annulation du job. Retourne False si le job n'existe pas ou est terminé."""
        job = self._jobs.get(job_id)
        if job is None or job.status in ("done", "error", "cancelled"):
            return False
        job.cancel_event.set()
        self.update(job_id, status="cancelled", finished_at=time.time())
        return True

    def launch(self, job: ExportJob, fn: Callable[[], str]) -> None:
        """Démarre fn() dans un thread daemon. fn() doit retourner le path du résultat."""
        def _run() -> None:
            self.update(job.id, status="running", started_at=time.time())
            try:
                result_path = fn()
                if job.cancel_event.is_set():
                    self.update(job.id, status="cancelled", finished_at=time.time())
                else:
                    self.update(job.id, status="done", progress=100,
                                result_path=result_path, finished_at=time.time())
            except Exception as exc:
                status = "cancelled" if job.cancel_event.is_set() else "error"
                self.update(job.id, status=status, error=str(exc),
                            finished_at=time.time())

        t = threading.Thread(target=_run, daemon=True)
        t.start()


job_manager = JobManager()
