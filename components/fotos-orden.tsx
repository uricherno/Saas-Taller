"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TIPOS_FOTO, type FotoOrden } from "@/lib/fotos";
import { borrarFoto, subirFoto } from "@/app/(privado)/ordenes/fotos-actions";
import { Selector } from "@/components/ui";

const LADO_MAXIMO = 1600;

/**
 * Achica la foto antes de subirla (las del celular pesan varios MB): lado
 * mayor de 1600 px, JPEG al 80 %. Si el navegador no puede, sube la original.
 */
async function achicar(archivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.8));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}

function Miniatura({
  foto,
  ordenId,
  puedeBorrar,
}: {
  foto: FotoOrden;
  ordenId: string;
  puedeBorrar: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, startTransition] = useTransition();
  const label = TIPOS_FOTO.find((t) => t.valor === foto.tipo)?.label ?? foto.tipo;

  return (
    <li className="space-y-1">
      {foto.url ? (
        <a href={foto.url} target="_blank" rel="noopener noreferrer" className="block">
          {/* Link firmado de Supabase: next/image necesitaría configurar el dominio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto.url}
            alt={foto.nota ?? label}
            loading="lazy"
            className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
          />
        </a>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">
          No disponible
        </div>
      )}
      <p className="truncate text-xs text-slate-600" title={foto.nota ?? undefined}>
        {label}
        {foto.nota && ` · ${foto.nota}`}
      </p>
      {puedeBorrar &&
        (confirmando ? (
          <span className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              disabled={borrando}
              onClick={() =>
                startTransition(async () => {
                  const r = await borrarFoto(foto.id, ordenId);
                  if (r.error) setError(r.error);
                  setConfirmando(false);
                })
              }
              className="font-semibold text-red-600 hover:underline disabled:opacity-60"
            >
              {borrando ? "Borrando…" : "Sí, borrar"}
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="text-slate-600 hover:underline">
              No
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className="text-xs text-red-600 hover:underline">
            Borrar
          </button>
        ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

/** Fotos del auto y del problema. Privadas: solo las ve el taller. */
export default function FotosOrden({
  ordenId,
  fotos,
  userId,
  esDueno,
}: {
  ordenId: string;
  fotos: FotoOrden[];
  userId: string;
  esDueno: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("auto");
  const [nota, setNota] = useState("");
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, startTransition] = useTransition();

  function subir(archivos: File[]) {
    if (!archivos.length) return;
    setError(null);
    startTransition(async () => {
      const errores: string[] = [];
      // De a una: cada envío tiene un límite de tamaño (y así se ve el avance).
      for (const [n, original] of archivos.entries()) {
        setProgreso(`Subiendo ${n + 1} de ${archivos.length}…`);
        const fd = new FormData();
        fd.set("foto", await achicar(original));
        fd.set("tipo", tipo);
        fd.set("nota", nota);
        const r = await subirFoto(ordenId, fd);
        if (r.error) errores.push(`${original.name}: ${r.error}`);
      }
      setProgreso(null);
      setNota("");
      if (input.current) input.current.value = "";
      if (errores.length) setError(errores.join(" "));
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <div>
        <h2 className="font-semibold text-slate-900">Fotos {fotos.length > 0 && <span className="text-slate-400">({fotos.length})</span>}</h2>
        <p className="text-sm text-slate-500">Del estado del auto al ingresar y del problema. Solo las ve tu taller.</p>
      </div>

      {fotos.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {fotos.map((f) => (
            <Miniatura key={f.id} foto={f} ordenId={ordenId} puedeBorrar={esDueno || f.subidaPor === userId} />
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_1fr]">
        <Selector label="Tipo de foto" opciones={TIPOS_FOTO} value={tipo} onChange={(e) => setTipo(e.target.value)} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Nota <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={300}
            placeholder="Ej: rayón puerta trasera"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </label>
      </div>
      <label className="block">
        <span className="sr-only">Elegir fotos</span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={subiendo}
          onChange={(e) => subir(Array.from(e.target.files ?? []))}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 disabled:opacity-60"
        />
      </label>
      {progreso && <p className="text-sm text-slate-600">{progreso}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
